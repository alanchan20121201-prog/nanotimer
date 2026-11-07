'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  Notification,
  screen,
  Tray,
  globalShortcut
} = require('electron');
const { snapPosition } = require('./window-snap');
const { tryDifferential } = require('./differential');

const APP_ID = 'com.alan.nanotimer';
const TIMING_T0 = Date.now();
const timingMark = (label) => {
  if (process.env.NANOTIMER_TIMING) {
    console.log(`[timing] ${label} +${Date.now() - TIMING_T0}ms`);
  }
};
const WINDOW_WIDTH = 468;
const WINDOW_HEIGHT = 476;
const EDGE_SNAP_DELAY_MS = 120;
const WINDOW_SIZES = Object.freeze({
  setup: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
  capsule: { width: 348, height: 236 },
  mini: { width: 208, height: 208 }
});
const DISPLAY_MODES = new Set(['setup', 'capsule', 'mini', 'fullscreen']);
const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.aac',
  '.flac',
  '.webm'
]);
const AUDIO_MIME_TYPES = Object.freeze({
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm'
});
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const AUDIO_DIRECTORY_NAME = 'alerts';
const AUDIO_TOKEN_PATTERN =
  /^[a-f0-9]{32}\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i;

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
const IMAGE_MIME_TYPES = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
});
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const BACKGROUND_DIRECTORY_NAME = 'backgrounds';
const BACKGROUND_TOKEN_PATTERN =
  /^[a-f0-9]{32}\.(png|jpe?g|webp|gif|bmp)$/i;

// One profile directory for every build (installer and portable) so an
// update never loses the background image, presets or history. Dropping a
// `portable.txt` file next to the executable keeps the profile local instead.
const modePositions = {};
let edgeSnapEnabled = true;
let prefsPath = null;

function resolveUserDataDirectory() {
  const override = process.env.NANOTIMER_PROFILE;
  if (override && override.trim()) {
    const resolved = path.resolve(override.trim());
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  }

  const exeDirectory = path.dirname(app.getPath('exe'));
  const portableMarker = path.join(exeDirectory, 'portable.txt');

  if (fs.existsSync(portableMarker)) {
    return path.join(exeDirectory, 'nanotimer');
  }

  const roamingDirectory = path.join(app.getPath('appData'), 'nanotimer');

  // Some machines (locked-down workstations, sandboxed launches) refuse
  // writes to %APPDATA%. Fall back to a profile next to the executable so the
  // app still starts with a writable profile instead of losing every setting.
  try {
    fs.mkdirSync(roamingDirectory, { recursive: true });
    // mkdir can succeed while the directory is still read-only for us, so
    // prove it is writable before handing it to Chromium.
    const probe = path.join(roamingDirectory, '.write-probe');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return roamingDirectory;
  } catch (error) {
    console.warn('nanotimer: appData unwritable, using local profile:', error.message);
    return path.join(exeDirectory, 'nanotimer');
  }
}

function migrateLegacyProfile(target) {
  const alreadyPopulated =
    fs.existsSync(target) && fs.readdirSync(target).length > 0;

  if (alreadyPopulated) {
    return;
  }

  const candidates = [
    path.join(path.dirname(app.getPath('exe')), 'NanoTimerData'),
    path.join(app.getPath('appData'), 'NanoTimer')
  ];

  for (const candidate of candidates) {
    if (candidate === target || !fs.existsSync(candidate)) {
      continue;
    }

    try {
      fs.cpSync(candidate, target, { recursive: true });
      console.log('nanotimer: migrated settings from', candidate);
      return;
    } catch (error) {
      console.warn('nanotimer: could not migrate', candidate, error.message);
    }
  }
}

try {
  const userDataDirectory = resolveUserDataDirectory();
  migrateLegacyProfile(userDataDirectory);
  fs.mkdirSync(userDataDirectory, { recursive: true });
  app.setPath('userData', userDataDirectory);
  loadPreferences(userDataDirectory);
} catch (error) {
  console.warn('nanotimer: using default userData directory:', error.message);
}

let mainWindow = null;
let snapTimer = null;
let suppressEdgeSnapUntil = 0;

// Per-mode window positions and small preferences live next to the profile so
// the widget reopens where the user left it.
// Window surface is temporarily transparent while a fullscreen restore is
// resizing the window (see setWindowDisplayMode).
let hiddenForResize = false;
// sha256 of the latest release asset, used to reject a corrupted download.
let expectedUpdateDigest = '';

let displayState = {
  mode: 'setup',
  restoreBounds: null,
  wasPinned: false
};

function clearEdgeSnap() {
  if (snapTimer !== null) {
    clearTimeout(snapTimer);
    snapTimer = null;
  }
}

/**
 * Snap after the native drag settles instead of fighting the drag. The display
 * work area respects the taskbar/dock. Only move when the target differs, so
 * the follow-up move event from setPosition cannot schedule another snap.
 */
// True while the renderer reports an active pointer drag. The edge snap is
// deferred until the drag ends so it never yanks the window out from under the
// pointer when the user pauses near a screen edge.
let windowDragging = false;

function loadPreferences(profileDir) {
  prefsPath = path.join(profileDir, 'preferences.json');

  try {
    const raw = fs.readFileSync(prefsPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object') {
      if (parsed.positions && typeof parsed.positions === 'object') {
        for (const mode of ['capsule', 'mini']) {
          const entry = parsed.positions[mode];

          if (entry && Number.isFinite(entry.x) && Number.isFinite(entry.y)) {
            modePositions[mode] = { x: entry.x, y: entry.y };
          }
        }
      }

      if (typeof parsed.edgeSnap === 'boolean') {
        edgeSnapEnabled = parsed.edgeSnap;
      }
    }
  } catch {
    // First run or unreadable file: keep the defaults.
  }
}

function savePreferences() {
  if (!prefsPath) {
    return;
  }

  try {
    fs.writeFileSync(
      prefsPath,
      JSON.stringify({ positions: modePositions, edgeSnap: edgeSnapEnabled }, null, 2),
      'utf8'
    );
  } catch (error) {
    console.warn('nanotimer: could not save preferences:', error?.message || error);
  }
}

function scheduleEdgeSnap(win) {
  clearEdgeSnap();

  if (!edgeSnapEnabled || windowDragging || Date.now() < suppressEdgeSnapUntil) {
    return;
  }

  snapTimer = setTimeout(() => {
    snapTimer = null;

    if (!win || win.isDestroyed() || displayState.mode === 'fullscreen') {
      return;
    }

    const bounds = win.getBounds();
    const display = screen.getDisplayMatching(bounds);

    if (!display) {
      return;
    }

    // Snap the window, not the card: the transparent gutter is what gives the
    // drop shadow room, so pushing the window off-screen to make the card look
    // flush would clip the shadow (and clip the card itself on 125% displays).
    const target = snapPosition(bounds, display.workArea);
    const moved = target.x !== bounds.x || target.y !== bounds.y;

    if (moved && (target.snappedX || target.snappedY)) {
      win.setPosition(target.x, target.y, false);
    }
  }, EDGE_SNAP_DELAY_MS);
}

const MODE_TRANSITION_MS = 190;
const FULLSCREEN_LEAVE_TIMEOUT_MS = 700;
let modeAnimationId = 0;
let modeAnimationSettle = null;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * Stop the resize currently in flight. The pending promise resolves with
 * `false`, so whoever is awaiting it can bail out instead of revealing a layout
 * that no longer matches the window.
 */
function cancelWindowAnimation() {
  if (modeAnimationId) {
    clearInterval(modeAnimationId);
    modeAnimationId = 0;
  }

  if (modeAnimationSettle) {
    const settle = modeAnimationSettle;
    modeAnimationSettle = null;
    settle(false);
  }
}

/**
 * Grow or shrink the window around its centre, one eased step per frame.
 * Anchoring both edges to the centre is what makes a capsule collapse into the
 * mini circle in place (the long axis travels further, the short one barely
 * moves) and makes fullscreen bloom outwards.
 *
 * Resolves once the window sits at its target size (or `false` when a newer
 * transition cancelled this one). The renderer keeps the scene faded out until
 * then: a transparent window that is resized while it still paints the previous
 * layout makes the DWM compositor stretch or crop that frame, which is the
 * flicker this app used to show on every mode change.
 */
function animateWindowBounds(win, from, to) {
  cancelWindowAnimation();

  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    let timerId = 0;

    const settle = (completed) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timerId) {
        clearInterval(timerId);
      }

      if (modeAnimationId === timerId) {
        modeAnimationId = 0;
      }

      if (modeAnimationSettle === settle) {
        modeAnimationSettle = null;
      }

      resolve(completed);
    };

    const step = () => {
      if (win.isDestroyed()) {
        settle(false);
        return;
      }

      const progress = Math.min(1, (Date.now() - startedAt) / MODE_TRANSITION_MS);
      const eased = easeOutCubic(progress);

      win.setBounds(
        {
          x: Math.round(from.x + (to.x - from.x) * eased),
          y: Math.round(from.y + (to.y - from.y) * eased),
          width: Math.max(1, Math.round(from.width + (to.width - from.width) * eased)),
          height: Math.max(1, Math.round(from.height + (to.height - from.height) * eased))
        },
        false
      );

      if (progress >= 1) {
        settle(true);
      }
    };

    modeAnimationSettle = settle;
    timerId = setInterval(step, 16);
    modeAnimationId = timerId;
    step();
  });
}

/**
 * Leaving fullscreen is asynchronous on Windows: `setFullScreen(false)` returns
 * before the compositor has handed the window back, and reading the bounds in
 * that window returns the fullscreen rectangle. Waiting for `leave-full-screen`
 * (with a timeout as a safety net) keeps the restored geometry honest.
 */
function leaveFullScreenAndWait(win) {
  return new Promise((resolve) => {
    if (!win.isFullScreen()) {
      resolve();
      return;
    }

    let done = false;
    let timeoutId = 0;

    const finish = () => {
      if (done) {
        return;
      }

      done = true;
      clearTimeout(timeoutId);
      win.removeListener('leave-full-screen', onLeave);
      resolve();
    };

    const onLeave = () => {
      // Give the OS one task turn to finish restoring the window frame before
      // anybody reads getBounds() again.
      setTimeout(finish, 0);
    };

    timeoutId = setTimeout(finish, FULLSCREEN_LEAVE_TIMEOUT_MS);
    win.once('leave-full-screen', onLeave);
    win.setFullScreen(false);
  });
}

function clampToWorkArea(win, x, y, width, height) {  const display = screen.getDisplayMatching(win.getBounds());

  if (!display) {
    return { x, y };
  }

  const { workArea } = display;
  const maxX = Math.max(workArea.x, workArea.x + workArea.width - width);
  const maxY = Math.max(workArea.y, workArea.y + workArea.height - height);

  return {
    x: Math.min(Math.max(x, workArea.x), maxX),
    y: Math.min(Math.max(y, workArea.y), maxY)
  };
}

/**
 * Resize the frameless window to the exact footprint of the selected display
 * mode. Fullscreen uses the display's full bounds (not just the work area) and
 * restores the previous position and pin state when the user leaves it.
 */
async function setWindowDisplayMode(win, nextMode, heightHint) {
  if (!win || win.isDestroyed() || !DISPLAY_MODES.has(nextMode)) {
    return false;
  }

  if (nextMode === 'fullscreen') {
    if (displayState.mode !== 'fullscreen') {
      const startBounds = win.getBounds();
      displayState.restoreBounds = startBounds;
      displayState.wasPinned = win.isAlwaysOnTop();
      displayState.mode = 'fullscreen';

      const display = screen.getDisplayMatching(startBounds);
      win.setAlwaysOnTop(true);
      suppressEdgeSnapUntil = Date.now() + 800;

      // Borderless fullscreen instead of win.setFullScreen(true): on Windows the
      // native transition replays a scaled snapshot of the window for ~150 ms
      // when it is restored, which showed up as a giant clipped clock over the
      // desktop. A frameless window sized to the display needs no OS transition
      // and animates back out exactly like every other mode change.
      win.setBounds(display.bounds, false);
    }

    return true;
  }

  const size = { ...(WINDOW_SIZES[nextMode] || WINDOW_SIZES.capsule) };

  // The setup card has one job per run mode; stopwatch hides the duration
  // fields, so it asks for a shorter window instead of centring a small block
  // in a tall card.
  if (nextMode === 'setup' && Number.isFinite(heightHint)) {
    size.height = Math.min(560, Math.max(340, Math.round(heightHint)));
  }

  const restoringFromFullscreen = displayState.mode === 'fullscreen';

  // Remember where the mode we are leaving was, so switching back restores it.
  if (!restoringFromFullscreen && (displayState.mode === 'capsule' || displayState.mode === 'mini')) {
    const current = win.getBounds();
    modePositions[displayState.mode] = { x: current.x, y: current.y };
    savePreferences();
  }
  const restore = displayState.restoreBounds;

  displayState.mode = nextMode;

  let from;

  if (restoringFromFullscreen) {
    if (win.isFullScreen()) {
      await leaveFullScreenAndWait(win);
    }

    if (win.isDestroyed()) {
      return false;
    }

    win.setAlwaysOnTop(displayState.wasPinned);
    from = restore || win.getBounds();

    // The renderer has already faded its content out. Hide the window surface
    // as well: while a fullscreen window is being restored Windows keeps
    // presenting the last fullscreen frame, which shows up as giant clipped
    // digits over the desktop for a few frames.
    hiddenForResize = true;
    win.setOpacity(0);

    // Park the window on its pre-fullscreen geometry before animating, so the
    // first eased frame matches what the user already sees and the card does not
    // blink at fullscreen size for a frame.
    win.setBounds(from, false);
  } else {
    from = win.getBounds();
  }

  // Keep the centre still: the widget collapses/expands in place instead of
  // jumping to wherever its top-left corner would land.
  const centerX = from.x + from.width / 2;
  const centerY = from.y + from.height / 2;
  const remembered = restoringFromFullscreen ? null : modePositions[nextMode];
  const position = clampToWorkArea(
    win,
    remembered ? remembered.x : Math.round(centerX - size.width / 2),
    remembered ? remembered.y : Math.round(centerY - size.height / 2),
    size.width,
    size.height
  );

  suppressEdgeSnapUntil = Date.now() + 600 + MODE_TRANSITION_MS;

  try {
    await animateWindowBounds(win, from, {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height
    });
  } finally {
    if (hiddenForResize) {
      hiddenForResize = false;

      if (!win.isDestroyed()) {
        win.setOpacity(1);
      }
    }
  }

  return true;
}

async function getAudioDirectory() {
  const directory = path.join(app.getPath('userData'), AUDIO_DIRECTORY_NAME);
  await fs.promises.mkdir(directory, { recursive: true });
  return directory;
}

async function copyAudioToAppData(sourcePath) {
  if (typeof sourcePath !== 'string' || sourcePath.length === 0) {
    throw new Error('Audio path is required.');
  }

  const extension = path.extname(sourcePath).toLowerCase();

  if (!AUDIO_EXTENSIONS.has(extension)) {
    throw new Error('Unsupported audio file type.');
  }

  const statistics = await fs.promises.stat(sourcePath);

  if (!statistics.isFile() || statistics.size > MAX_AUDIO_BYTES) {
    throw new Error('Audio file is too large.');
  }

  const token = `${crypto.randomUUID().replace(/-/g, '')}${extension}`;
  const directory = await getAudioDirectory();

  await fs.promises.copyFile(sourcePath, path.join(directory, token));
  return token;
}

async function readAudioFile(token) {
  if (typeof token !== 'string' || !AUDIO_TOKEN_PATTERN.test(token)) {
    throw new Error('Invalid audio token.');
  }

  const filePath = path.join(await getAudioDirectory(), path.basename(token));
  const extension = path.extname(token).toLowerCase();
  const statistics = await fs.promises.stat(filePath);

  if (!statistics.isFile() || statistics.size > MAX_AUDIO_BYTES) {
    throw new Error('Audio file is too large.');
  }

  const data = await fs.promises.readFile(filePath);
  const mime = AUDIO_MIME_TYPES[extension] || 'application/octet-stream';

  return `data:${mime};base64,${data.toString('base64')}`;
}

/**
 * Custom background: the picked image is copied into userData under a random
 * token, so the renderer only ever receives a token — never a filesystem path
 * it could use to read arbitrary files.
 */
async function getBackgroundDirectory() {
  const directory = path.join(app.getPath('userData'), BACKGROUND_DIRECTORY_NAME);
  await fs.promises.mkdir(directory, { recursive: true });
  return directory;
}

async function copyBackgroundToAppData(sourcePath) {
  if (typeof sourcePath !== 'string' || sourcePath.length === 0) {
    throw new Error('Image path is required.');
  }

  const extension = path.extname(sourcePath).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error('Unsupported image file type.');
  }

  const statistics = await fs.promises.stat(sourcePath);

  if (!statistics.isFile() || statistics.size > MAX_IMAGE_BYTES) {
    throw new Error('Image file is too large.');
  }

  const token = `${crypto.randomUUID().replace(/-/g, '')}${extension}`;
  const directory = await getBackgroundDirectory();

  await fs.promises.copyFile(sourcePath, path.join(directory, token));
  return token;
}

async function readBackgroundFile(token) {
  if (typeof token !== 'string' || !BACKGROUND_TOKEN_PATTERN.test(token)) {
    throw new Error('Invalid background token.');
  }

  const filePath = path.join(await getBackgroundDirectory(), path.basename(token));
  const extension = path.extname(token).toLowerCase();
  const statistics = await fs.promises.stat(filePath);

  if (!statistics.isFile() || statistics.size > MAX_IMAGE_BYTES) {
    throw new Error('Image file is too large.');
  }

  const data = await fs.promises.readFile(filePath);
  const mime = IMAGE_MIME_TYPES[extension] || 'application/octet-stream';

  return `data:${mime};base64,${data.toString('base64')}`;
}

/**
 * Create the single floating NanoTimer window.
 *
 * Requirement 1: frame:false + transparent:true creates a chrome-less,
 * transparent surface that the renderer paints itself.
 * Requirement 2: alwaysOnTop:false keeps the initial window at normal level,
 * so other applications can cover it naturally. Step 4 adds an explicit
 * user-controlled pin toggle without changing this default.
 */
function createMainWindow() {
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    center: true,
    title: 'nanotimer',
    icon: path.join(__dirname, '..', 'renderer', 'icon.png'),

    // Frameless + transparent surface.
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    // Do not let Windows add a native WS_THICKFRAME border around the widget.
    thickFrame: false,
    // Windows 11 otherwise draws its rounded-corner frame (a faint light line
    // along the window corners) over the transparent edges of the widget.
    roundedCorners: false,

    // Normal level by default; the Step 4 Pin action is an explicit opt-in.
    alwaysOnTop: false,

    // The widget has a fixed, compact footprint.
    resizable: false,
    maximizable: false,
    fullscreenable: true,
    minimizable: true,

    // Avoid a white flash while the renderer paints the transparent window.
    show: false,
    acceptFirstMouse: true,

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
      // Keep the one-second countdown and its completion state accurate while
      // the widget is minimized or covered by another application.
      backgroundThrottling: false
    }
  });

  // Explicitly normalise the window level after creation as well. This is
  // intentionally false: NanoTimer must be covered by active applications.
  win.setAlwaysOnTop(false);

  // The widget only ever renders local UI. Deny popups and page navigation.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // Keep Escape authoritative even if focus is inside a renderer control.
  // The renderer applies the actual CSS mode and resizes through IPC.
  win.webContents.on('before-input-event', (event, input) => {
    if (
      input.type === 'keyDown' &&
      (input.key === 'Escape' || input.key === 'Esc' || input.code === 'Escape') &&
      displayState.mode === 'fullscreen'
    ) {
      event.preventDefault();
      win.webContents.send('window:exit-fullscreen');
    }
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  win.on('move', () => {
    scheduleEdgeSnap(win);
  });

  // Transparent, initially hidden windows can occasionally miss
  // `ready-to-show`. Reveal on the first of these signals, with a timeout as a
  // final fallback, so launching the packaged exe never leaves an invisible
  // process running with no way to interact with it.
  let revealed = false;
  const reveal = () => {
    if (revealed || win.isDestroyed()) {
      return;
    }

    revealed = true;
    timingMark('window show');
    win.show();
    win.focus();
    // The tray costs ~45ms and nothing on screen depends on it, so build it
    // after the window is visible instead of delaying the first paint.
    setImmediate(() => {
      try {
        createTray();
      } catch (error) {
        console.warn('nanotimer: tray unavailable:', error.message);
      }
    });
  };

  win.once('ready-to-show', () => {
    timingMark('ready-to-show');
    reveal();
  });
  win.webContents.once('did-finish-load', () => {
    setTimeout(reveal, 0);
  });
  setTimeout(reveal, 1500);

  win.on('closed', () => {
    clearEdgeSnap();

    if (mainWindow === win) {
      mainWindow = null;
      displayState = {
        mode: 'setup',
        restoreBounds: null,
        wasPinned: false
      };
    }

    // Do not rely on window-all-closed alone: quitting from inside the close
    // sequence can be swallowed, which leaves an invisible process holding the
    // single-instance lock — the app then looks "unlaunchable" until the user
    // kills it by hand.
    if (process.platform !== 'darwin') {
      setImmediate(() => {
        if (BrowserWindow.getAllWindows().length === 0) {
          app.quit();
        }
      });
    }
  });

  return win;
}

function focusMainWindow() {
  // A second launch must always put a window on screen, even if the previous
  // one was closed (closed asynchronously, or the window was destroyed while
  // the process lingered).
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function registerWindowIpc() {
  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('window:get-position', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.getPosition() ?? [0, 0];
  });

  ipcMain.handle('window:get-bounds', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.getBounds() ?? null;
  });

  ipcMain.handle('window:set-position', (event, x, y, width, height) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      return false;
    }

    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win) {
      return false;
    }

    if (typeof width === 'number' && typeof height === 'number') {
      win.setBounds(
        {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.max(1, Math.round(width)),
          height: Math.max(1, Math.round(height))
        },
        false
      );
      return true;
    }

    win.setPosition(Math.round(x), Math.round(y), false);
    return true;
  });

  ipcMain.handle('window:get-always-on-top', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isAlwaysOnTop() ?? false;
  });

  ipcMain.handle('window:set-always-on-top', (event, pinned) => {
    if (typeof pinned !== 'boolean') {
      return false;
    }

    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win) {
      return false;
    }

    win.setAlwaysOnTop(pinned);
    return win.isAlwaysOnTop();
  });

  ipcMain.on('window:drag-state', (event, dragging) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    windowDragging = Boolean(dragging);

    if (!windowDragging && win && !win.isDestroyed()) {
      scheduleEdgeSnap(win);
    }
  });

  ipcMain.handle('app:set-prefs', (event, prefs) => {
    if (prefs && typeof prefs.edgeSnap === 'boolean') {
      edgeSnapEnabled = prefs.edgeSnap;
      savePreferences();
    }

    return { edgeSnap: edgeSnapEnabled };
  });

  ipcMain.handle('settings:export', async (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win || typeof payload !== 'string' || payload.length > 1024 * 1024) {
      return { ok: false };
    }

    const result = await dialog.showSaveDialog(win, {
      title: 'Export nanotimer settings',
      defaultPath: 'nanotimer-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }

    try {
      fs.writeFileSync(result.filePath, payload, 'utf8');
      return { ok: true, path: result.filePath };
    } catch {
      return { ok: false };
    }
  });

  ipcMain.handle('settings:import', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win) {
      return { ok: false };
    }

    const result = await dialog.showOpenDialog(win, {
      title: 'Import nanotimer settings',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, canceled: true };
    }

    try {
      const text = fs.readFileSync(result.filePaths[0], 'utf8');

      if (text.length > 1024 * 1024) {
        return { ok: false };
      }

      return { ok: true, text };
    } catch {
      return { ok: false };
    }
  });

  ipcMain.handle('window:set-display-mode', async (event, mode, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win) {
      return false;
    }

    // Resolves only after the resize animation finished, so the renderer can
    // hold the new scene back until the window is the right size.
    return setWindowDisplayMode(win, mode, options && options.height);
  });

  ipcMain.handle('audio:pick', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win) {
      return null;
    }

    try {
      const result = await dialog.showOpenDialog(win, {
        title: 'Choose a completion sound',
        properties: ['openFile'],
        filters: [
          {
            name: 'Audio',
            extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm']
          }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = result.filePaths[0];
      const token = await copyAudioToAppData(filePath);

      return {
        token,
        dataUrl: await readAudioFile(token)
      };
    } catch (error) {
      console.error('NanoTimer: could not import completion sound.', error);
      return null;
    }
  });

  ipcMain.handle('audio:load', async (event, token) => {
    if (
      !BrowserWindow.fromWebContents(event.sender) ||
      typeof token !== 'string' ||
      !AUDIO_TOKEN_PATTERN.test(token)
    ) {
      return null;
    }

    try {
      return {
        token,
        dataUrl: await readAudioFile(token)
      };
    } catch (error) {
      console.warn('NanoTimer: custom completion sound unavailable.', error.message);
      return null;
    }
  });

  ipcMain.handle('background:pick', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win) {
      return null;
    }

    try {
      const result = await dialog.showOpenDialog(win, {
        title: 'Choose a background image',
        properties: ['openFile'],
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']
          }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const token = await copyBackgroundToAppData(result.filePaths[0]);
      return { token, dataUrl: await readBackgroundFile(token) };
    } catch (error) {
      console.error('NanoTimer: could not import background image.', error);
      return null;
    }
  });

  ipcMain.handle('background:load', async (event, token) => {
    if (
      !BrowserWindow.fromWebContents(event.sender) ||
      typeof token !== 'string' ||
      !BACKGROUND_TOKEN_PATTERN.test(token)
    ) {
      return null;
    }

    try {
      return { token, dataUrl: await readBackgroundFile(token) };
    } catch (error) {
      console.warn('NanoTimer: background image unavailable.', error.message);
      return null;
    }
  });

  ipcMain.handle('notes:export', async (event, text, suggestedName) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win || typeof text !== 'string' || text.length > 1_000_000) {
      return { canceled: true };
    }

    try {
      const result = await dialog.showSaveDialog(win, {
        title: 'Export nanotimer log',
        defaultPath:
          typeof suggestedName === 'string' ? suggestedName : 'nanotimer-log.txt',
        filters: [{ name: 'Text', extensions: ['txt'] }]
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }

      await fs.promises.writeFile(result.filePath, text, 'utf8');
      return { canceled: false, path: result.filePath };
    } catch (error) {
      console.error('NanoTimer: could not export log.', error);
      return { canceled: true, error: error.message };
    }
  });

  ipcMain.handle('update:check', async () => {
    try {
      const result = await fetchLatestRelease();
      expectedUpdateDigest = String(result?.digest || '').replace(/^sha256:/i, '');
      return result;
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  });

  async function verifyInstaller(filePath) {
    if (!expectedUpdateDigest) {
      return true;
    }

    try {
      const buffer = await fs.promises.readFile(filePath);
      const actual = crypto.createHash('sha256').update(buffer).digest('hex');

      if (actual !== expectedUpdateDigest) {
        // A truncated or corrupted transfer is the usual culprit, so report the
        // hashes and let the caller try a clean download once more.
        console.warn(
          'nanotimer: update digest mismatch. expected %s, got %s, %d bytes',
          expectedUpdateDigest.slice(0, 12),
          actual.slice(0, 12),
          buffer.length
        );
        return false;
      }

      return true;
    } catch (error) {
      console.warn('nanotimer: update verification failed.', error.message);
      return false;
    }
  }

  ipcMain.handle('update:download', async (event, url, suggestedName) => {
    if (!isTrustedUpdateUrl(url)) {
      return { ok: false, message: 'untrusted' };
    }

    try {
      const parsed = new URL(String(url));
      const rawName = String(suggestedName || path.basename(parsed.pathname));
      const fileName =
        rawName.replace(/[^\w.-]/g, '_').slice(-80) || 'nanotimer-update.exe';
      const directory = path.join(
        app.getPath('userData'),
        UPDATE_DIRECTORY_NAME
      );

      await fs.promises.mkdir(directory, { recursive: true });

      const target = path.join(directory, fileName);
      const userAgent = `nanotimer/${app.getVersion()}`;
      let lastReport = 0;

      // Reuse the previous installer so only changed blocks travel over the
      // network. Falls back to the plain download below on any problem.
      const differential = await tryDifferential({
        url: parsed.toString(),
        target: fileName,
        directory,
        userAgent,
        onProgress: (progress) => {
          if (Date.now() - lastReport > 200) {
            lastReport = Date.now();
            event.sender.send('update:progress', {
              received: progress.downloaded,
              total: progress.total,
              differential: true
            });
          }
        }
      });

      if (differential) {
        event.sender.send('update:progress', {
          received: differential.bytes,
          total: differential.bytes,
          differential: true
        });

        if (await verifyInstaller(target)) {
          return {
            ok: true,
            path: target,
            name: fileName,
            differential: true,
            bytes: differential.bytes,
            downloaded: differential.downloaded,
            savedPercent: Math.round((differential.savedRatio || 0) * 100)
          };
        }

        // The patched file did not match the published digest; drop it and pull
        // a clean copy instead of refusing the update.
        console.warn('nanotimer: differential result rejected, downloading in full.');
        await fs.promises.rm(target, { force: true });
      }

      const downloadFull = async () => {
        const response = await net.fetch(parsed.toString());

        if (!response.ok || !response.body) {
          return { error: String(response.status) };
        }

        const total = Number(response.headers.get('content-length') || 0);
        let received = 0;
        lastReport = 0;
        const handle = await fs.promises.open(target, 'w');

        try {
          for await (const chunk of response.body) {
            await handle.write(chunk);
            received += chunk.length;

            if (Date.now() - lastReport > 200) {
              lastReport = Date.now();
              event.sender.send('update:progress', { received, total });
            }
          }
        } finally {
          await handle.close();
        }

        event.sender.send('update:progress', {
          received,
          total: total || received
        });

        return { received };
      };

      let attempt = await downloadFull();

      if (!attempt.error && !(await verifyInstaller(target))) {
        await fs.promises.rm(target, { force: true });
        console.warn('nanotimer: retrying the download once.');
        attempt = await downloadFull();
      }

      if (attempt.error) {
        return { ok: false, message: attempt.error };
      }

      if (!(await verifyInstaller(target))) {
        await fs.promises.rm(target, { force: true });
        return { ok: false, message: 'checksum' };
      }

      return { ok: true, path: target, name: fileName };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  ipcMain.handle('update:install', async (_event, filePath) => {
    const directory = path.resolve(
      app.getPath('userData'),
      UPDATE_DIRECTORY_NAME
    );
    const resolved = path.resolve(String(filePath));

    if (
      !resolved.startsWith(directory + path.sep) ||
      !/\.exe$/i.test(resolved) ||
      !fs.existsSync(resolved)
    ) {
      return false;
    }

    try {
      // The installer replaces files in place, so the app has to step aside.
      spawn(resolved, [], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
      return true;
    } catch (error) {
      console.error('nanotimer: could not start the updater.', error);
      return false;
    }
  });

  ipcMain.on('tray:update', (_event, text) => {
    if (tray) {
      tray.setToolTip(String(text).slice(0, 120));
    }
  });

  ipcMain.on('app:language', (_event, language) => {
    trayLanguage = Object.prototype.hasOwnProperty.call(TRAY_LABELS, language)
      ? language
      : 'en';
    buildTrayMenu();
  });

  ipcMain.handle('timer:notify-complete', (event, payload) => {
    if (!BrowserWindow.fromWebContents(event.sender)) {
      return false;
    }

    if (!Notification.isSupported()) {
      return false;
    }

    const title =
      typeof payload?.title === 'string'
        ? payload.title.slice(0, 80)
        : 'nanotimer';
    const body =
      typeof payload?.body === 'string' ? payload.body.slice(0, 200) : '';

    try {
      new Notification({ title, body, silent: true }).show();
      return true;
    } catch (error) {
      console.error('NanoTimer: could not show completion notification.', error);
      return false;
    }
  });
}

// The repository is read from package.json so a fork only has to change the
// metadata there instead of hunting for a second copy of the owner here.
// electron-builder strips the `build` block from the packaged package.json, so
// `repository` / `homepage` (which survive packaging) are the primary source.
const PACKAGE_JSON = require('../../package.json');
const PUBLISH_CONFIG = Array.isArray(PACKAGE_JSON.build?.publish)
  ? PACKAGE_JSON.build.publish[0]
  : null;

function resolveRepositorySlug() {
  if (PUBLISH_CONFIG && PUBLISH_CONFIG.owner && PUBLISH_CONFIG.repo) {
    return [PUBLISH_CONFIG.owner, PUBLISH_CONFIG.repo];
  }

  const candidates = [
    typeof PACKAGE_JSON.repository === 'string'
      ? PACKAGE_JSON.repository
      : PACKAGE_JSON.repository && PACKAGE_JSON.repository.url,
    PACKAGE_JSON.homepage,
    PACKAGE_JSON.bugs && PACKAGE_JSON.bugs.url
  ];

  for (const candidate of candidates) {
    const match =
      typeof candidate === 'string'
        ? candidate.match(
            /github\.com[/:]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/#?]|$)/i
          )
        : null;

    if (match) {
      return [match[1], match[2]];
    }
  }

  return ['alanchan20121201-prog', 'nanotimer'];
}

const [UPDATE_OWNER, UPDATE_REPO] = resolveRepositorySlug();
console.log(`nanotimer: update source github.com/${UPDATE_OWNER}/${UPDATE_REPO}`);
const UPDATE_DIRECTORY_NAME = 'updates';
const RELEASE_API = `https://api.github.com/repos/${UPDATE_OWNER}/${UPDATE_REPO}/releases/latest`;

function compareVersions(a, b) {
  const parse = (value) =>
    String(value || '0')
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .map((part) => Number.parseInt(part, 10) || 0);

  const left = parse(a);
  const right = parse(b);

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

// Fallback that does not touch the REST API: the releases Atom feed lists the
// newest tag and is served to everyone without a rate limit, so a machine that
// has burned its 60 anonymous API calls per hour still sees updates.
async function fetchLatestReleaseFromFeed() {
  try {
    const response = await net.fetch(
      `https://github.com/${UPDATE_OWNER}/${UPDATE_REPO}/releases.atom`,
      {
        redirect: 'follow',
        headers: { 'User-Agent': `nanotimer/${app.getVersion()}` }
      }
    );

    if (!response.ok) {
      return null;
    }

    const body = await response.text();
    const match = body.match(/\/releases\/tag\/([^"<]+)/);

    if (!match) {
      return null;
    }

    const latest = decodeURIComponent(match[1]).replace(/^v/i, '');
    const assetName = `${PACKAGE_JSON.name}-${latest}-setup.exe`;

    return {
      status: 'ok',
      current: app.getVersion(),
      latest,
      newer: compareVersions(latest, app.getVersion()) > 0,
      name: assetName,
      url: `https://github.com/${UPDATE_OWNER}/${UPDATE_REPO}/releases/download/v${latest}/${assetName}`,
      notes: ''
    };
  } catch (error) {
    console.warn('nanotimer: release feed failed', error && error.message);
    return null;
  }
}

async function fetchLatestRelease() {
  let release = null;

  try {
    const response = await net.fetch(RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `nanotimer/${app.getVersion()}`
      }
    });

    if (response.ok) {
      release = await response.json();
    }
  } catch (error) {
    console.warn('nanotimer: release api failed', error && error.message);
    release = null;
  }

  if (!release) {
    const fallback = await fetchLatestReleaseFromFeed();

    return fallback || { status: 'error' };
  }
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const tagVersion = String(release.tag_name || '').replace(/^v/i, '');
  const installers = assets.filter((entry) => /-setup\.exe$/i.test(entry.name));
  // Prefer the asset that carries this release's version, so a stale upload
  // left on an older release can never win.
  const asset =
    installers.find((entry) => entry.name.includes(`-${tagVersion}-`)) ||
    installers[0] ||
    assets.find((entry) => /\.exe$/i.test(entry.name)) ||
    null;

  return {
    status: 'ok',
    current: app.getVersion(),
    latest: String(release.tag_name || '').replace(/^v/i, ''),
    newer: compareVersions(release.tag_name, app.getVersion()) > 0,
    name: asset ? asset.name : '',
    url: asset ? asset.browser_download_url : release.html_url || '',
    // GitHub publishes a sha256 digest per asset; the atom fallback has none.
    digest: asset && asset.digest ? String(asset.digest) : '',
    notes: String(release.body || '').slice(0, 400)
  };
}

function isTrustedUpdateUrl(value) {
  try {
    const url = new URL(String(value));

    return (
      url.protocol === 'https:' &&
      (/(^|\.)github\.com$/.test(url.hostname) ||
        /(^|\.)githubusercontent\.com$/.test(url.hostname))
    );
  } catch (error) {
    return false;
  }
}

const TRAY_LABELS = Object.freeze({
  en: {
    show: 'Show window',
    hide: 'Hide window',
    toggle: 'Pause or resume',
    quit: 'Quit'
  },
  'zh-TW': {
    show: '顯示視窗',
    hide: '隱藏視窗',
    toggle: '暫停或繼續',
    quit: '結束'
  },
  'zh-CN': {
    show: '显示窗口',
    hide: '隐藏窗口',
    toggle: '暂停或继续',
    quit: '退出'
  },
  ja: {
    show: 'ウィンドウを表示',
    hide: 'ウィンドウを隠す',
    toggle: '一時停止／再開',
    quit: '終了'
  }
});

const GLOBAL_SHORTCUTS = Object.freeze([
  ['CommandOrControl+Alt+Space', 'toggle'],
  ['CommandOrControl+Alt+R', 'reset']
]);

let tray = null;
let trayLanguage = 'en';

function trayLabel(key) {
  const table = TRAY_LABELS[trayLanguage] || TRAY_LABELS.en;
  return table[key] || TRAY_LABELS.en[key];
}

function sendGlobalAction(action) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('timer:global-action', action);
}

function buildTrayMenu() {
  if (!tray) {
    return;
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: trayLabel('show'),
        click: () => {
          if (!mainWindow) {
            return;
          }
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: trayLabel('hide'),
        click: () => mainWindow?.hide()
      },
      { type: 'separator' },
      { label: trayLabel('toggle'), click: () => sendGlobalAction('toggle') },
      { type: 'separator' },
      { label: trayLabel('quit'), click: () => app.quit() }
    ])
  );
}

function createTray() {
  try {
    tray = new Tray(path.join(__dirname, '..', 'renderer', 'icon.png'));
  } catch (error) {
    console.error('NanoTimer: could not create the tray icon.', error);
    tray = null;
    return;
  }

  tray.setToolTip('nanotimer');
  buildTrayMenu();
  tray.on('click', () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerGlobalShortcuts() {
  for (const [accelerator, action] of GLOBAL_SHORTCUTS) {
    try {
      globalShortcut.register(accelerator, () => sendGlobalAction(action));
    } catch (error) {
      // Another app may already own the combination; the in-window shortcuts
      // keep working regardless.
      console.error(`NanoTimer: could not register ${accelerator}.`, error);
    }
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);

  app
    .whenReady()
    .then(() => {
      timingMark('app ready');
      if (process.platform === 'win32') {
        app.setAppUserModelId(APP_ID);
      }

      // A frameless widget has no use for the Windows/Linux application menu.
      // Keep the macOS menu so standard shortcuts such as Cmd+Q still work.
      if (process.platform !== 'darwin') {
        Menu.setApplicationMenu(null);
      }

      registerWindowIpc();
      mainWindow = createMainWindow();
      registerGlobalShortcuts();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          mainWindow = createMainWindow();
        } else {
          focusMainWindow();
        }
      });
    })
    .catch((error) => {
      console.error('Failed to start NanoTimer:', error);
      app.quit();
    });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();

    if (tray) {
      tray.destroy();
      tray = null;
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
