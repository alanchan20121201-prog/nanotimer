'use strict';

// Content-defined differential download for the installer.
//
// electron-builder publishes a `<installer>.exe.blockmap` next to every setup
// file. It lists the installer as a sequence of chunks whose boundaries follow
// the content, so an unchanged region of a new build produces exactly the same
// checksum as the old build:
//
//   { version, files: [{ name, offset, sizes: [...], checksums: [...] }] }
//
// That is all we need. Index the *old* blockmap, then for every chunk of the
// new installer either copy the bytes out of the cached old installer or
// download just that byte range. The checksum algorithm is an implementation
// detail of app-builder — we only ever compare the published strings.
//
// Everything here is best effort: any failure returns null and the caller falls
// back to a plain download.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { net } = require('electron');

const MIN_OLD_FILE_BYTES = 1024 * 1024;
const MIN_SAVING_RATIO = 0.9; // give up when almost every chunk changed
const FETCH_TIMEOUT_MS = 20000;

async function fetchBuffer(url, userAgent, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await net.fetch(url, {
      headers: { 'User-Agent': userAgent, ...(headers || {}) },
      signal: controller.signal,
      redirect: 'follow'
    });

    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    return { ok: true, buffer: Buffer.from(await response.arrayBuffer()) };
  } catch (error) {
    return { ok: false, status: 0, error: String(error && error.message) };
  } finally {
    clearTimeout(timer);
  }
}

function decodeBlockmap(buffer) {
  const raw = buffer[0] === 0x1f && buffer[1] === 0x8b ? zlib.gunzipSync(buffer) : buffer;
  const parsed = JSON.parse(raw.toString('utf8'));
  const file = Array.isArray(parsed.files) ? parsed.files[0] : null;

  if (!file || !Array.isArray(file.sizes) || !Array.isArray(file.checksums)) {
    return null;
  }

  if (file.sizes.length !== file.checksums.length) {
    return null;
  }

  return {
    offset: Number(file.offset) || 0,
    sizes: file.sizes,
    checksums: file.checksums
  };
}

async function fetchBlockmap(url, userAgent) {
  const result = await fetchBuffer(`${url}.blockmap`, userAgent);

  if (!result.ok) {
    return null;
  }

  try {
    return decodeBlockmap(result.buffer);
  } catch {
    return null;
  }
}

function findCachedInstaller(directory, targetName) {
  let entries;

  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return null;
  }

  let best = null;

  for (const entry of entries) {
    if (!entry.isFile() || !/\.exe$/i.test(entry.name) || entry.name === targetName) {
      continue;
    }

    const full = path.join(directory, entry.name);
    let stat;

    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }

    if (stat.size < MIN_OLD_FILE_BYTES) {
      continue;
    }

    if (!best || stat.mtimeMs > best.mtimeMs) {
      best = { path: full, name: entry.name, size: stat.size, mtimeMs: stat.mtimeMs };
    }
  }

  return best;
}

function versionFromInstallerName(name) {
  const match = /^nanotimer-(\d+\.\d+\.\d+)-setup\.exe$/i.exec(name);

  return match ? match[1] : null;
}

function previousDownloadUrl(url, version, name) {
  const match = /^(.*\/releases\/download\/)v[^/]+\/([^/]+)$/.exec(url);

  if (!match) {
    return null;
  }

  return `${match[1]}v${version}/${name}`;
}

function indexOldFile(blockmap) {
  const index = new Map();
  let offset = blockmap.offset;

  for (let i = 0; i < blockmap.sizes.length; i += 1) {
    const size = blockmap.sizes[i];
    const key = blockmap.checksums[i];

    if (!index.has(key)) {
      index.set(key, { offset, size });
    }

    offset += size;
  }

  return index;
}

async function downloadRange(url, start, end, userAgent) {
  const response = await net.fetch(url, {
    headers: { 'User-Agent': userAgent, Range: `bytes=${start}-${end - 1}` },
    redirect: 'follow'
  });

  if (response.status !== 206) {
    throw new Error(`range request refused (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function tryDifferential(options) {
  const { url, target, directory, userAgent, onProgress } = options;
  const old = findCachedInstaller(directory, target);

  if (!old) {
    return null;
  }

  const oldVersion = versionFromInstallerName(old.name);
  const previousUrl = oldVersion ? previousDownloadUrl(url, oldVersion, old.name) : null;

  if (!previousUrl) {
    return null;
  }

  const newMap = await fetchBlockmap(url, userAgent);

  if (!newMap) {
    return null;
  }

  const oldMap = await fetchBlockmap(previousUrl, userAgent);

  if (!oldMap) {
    return null;
  }

  const oldIndex = indexOldFile(oldMap);
  const totalBytes = newMap.sizes.reduce((sum, value) => sum + value, 0);

  // Consecutive copied chunks become one read; consecutive missing chunks
  // become one ranged request.
  const runs = [];
  let newOffset = newMap.offset;

  for (let i = 0; i < newMap.sizes.length; i += 1) {
    const size = newMap.sizes[i];
    const hit = oldIndex.get(newMap.checksums[i]);
    const copyable = Boolean(hit) && hit.size === size;
    const last = runs[runs.length - 1];

    if (copyable) {
      if (last && last.kind === 'copy' && last.source + last.length === hit.offset) {
        last.length += size;
      } else {
        runs.push({ kind: 'copy', source: hit.offset, target: newOffset, length: size });
      }
    } else if (last && last.kind === 'fetch' && last.target + last.length === newOffset) {
      last.length += size;
    } else {
      runs.push({ kind: 'fetch', target: newOffset, length: size });
    }

    newOffset += size;
  }

  const fetchBytes = runs
    .filter((run) => run.kind === 'fetch')
    .reduce((sum, run) => sum + run.length, 0);

  if (totalBytes === 0 || fetchBytes > totalBytes * MIN_SAVING_RATIO) {
    return null;
  }

  const partPath = `${path.join(directory, target)}.part`;
  const handle = await fsp.open(partPath, 'w');
  let copied = 0;
  let fetched = 0;

  try {
    const oldHandle = await fsp.open(old.path, 'r');

    try {
      for (const run of runs) {
        if (run.kind === 'copy') {
          const buffer = Buffer.allocUnsafe(run.length);
          await oldHandle.read(buffer, 0, run.length, run.source);
          await handle.write(buffer, 0, run.length, run.target);
          copied += run.length;
        } else {
          const buffer = await downloadRange(url, run.target, run.target + run.length, userAgent);

          if (buffer.length !== run.length) {
            throw new Error('short range response');
          }

          await handle.write(buffer, 0, buffer.length, run.target);
          fetched += run.length;
        }

        if (typeof onProgress === 'function') {
          const done = copied + fetched;
          onProgress({
            percent: totalBytes ? Math.min(100, Math.round((done / totalBytes) * 100)) : 0,
            downloaded: fetched,
            total: totalBytes
          });
        }
      }
    } finally {
      await oldHandle.close();
    }
  } catch (error) {
    await handle.close().catch(() => {});
    await fsp.rm(partPath, { force: true }).catch(() => {});
    console.warn('nanotimer: differential update failed:', error && error.message);

    return null;
  }

  await handle.close();

  const stats = await fsp.stat(partPath).catch(() => null);

  if (!stats || stats.size !== totalBytes) {
    await fsp.rm(partPath, { force: true }).catch(() => {});
    console.warn('nanotimer: differential update produced the wrong size');

    return null;
  }

  const finalPath = path.join(directory, target);
  await fsp.rm(finalPath, { force: true }).catch(() => {});
  await fsp.rename(partPath, finalPath);

  return {
    path: finalPath,
    name: target,
    bytes: totalBytes,
    downloaded: fetched,
    copied,
    savedRatio: totalBytes ? 1 - fetched / totalBytes : 0
  };
}

module.exports = { tryDifferential, findCachedInstaller, versionFromInstallerName };
