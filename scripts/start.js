'use strict';

const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

// Keep Electron's binary cache inside the project by default. Besides making
// the project self-contained, this avoids permission problems when the host
// only allows writes under the workspace.
process.env.electron_config_cache ??= path.join(projectRoot, '.electron-cache');

// VS Code and other Electron-based terminals export ELECTRON_RUN_AS_NODE=1.
// If inherited, it makes Electron run as plain Node, and `require('electron')`
// returns a path string instead of the Electron API. Strip it for the app.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// Windows 11 25H2 (build 26200) can terminate Electron's sandboxed process
// with STATUS_BREAKPOINT before the first window. This affects `npm start`
// on that OS build; the packaged launcher sets the same compatibility flag.
const windowsBuild = Number(os.release().split('.')[2] || 0);
if (process.platform === 'win32' && windowsBuild >= 26200) {
  env.ELECTRON_DISABLE_SANDBOX = '1';
}

let electronPath;

try {
  electronPath = require('electron');
} catch (error) {
  console.error('NanoTimer: Electron is not installed correctly.');
  console.error(error.message);
  process.exit(1);
}

const child = spawn(electronPath, [projectRoot, ...process.argv.slice(2)], {
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('error', (error) => {
  console.error('NanoTimer: failed to launch Electron.', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}
