'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  Notification,
  screen
} = require('electron');
const { snapPosition } = require('./window-snap');

const APP_ID = 'com.nanotimer.app';
const WINDOW_WIDTH = 468;
const WINDOW_HEIGHT = 378;
const EDGE_SNAP_DELAY_MS = 120;
const WINDOW_SIZES = Object.freeze({
  setup: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
  capsule: { width: 348, height: 198 },
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

// A portable build should keep its settings beside the executable rather than
// in a roaming profile that may be read-only for the app's integrity level.
// Fall back to Electron's default if the install directory is not writable
// (for example when the app is placed under Program Files).
try {
  const portableUserData = path.join(path.dirname(app.getPath('exe')), 'NanoTimerData');
  fs.mkdirSync(portableUserData, { recursive: true });
  app.setPath('userData', portableUserData);
} catch (error) {
  console.warn('NanoTimer: using default userData directory:', error.message);
}

let mainWindow = null;
let snapTimer = null;
let suppressEdgeSnapUntil = 0;
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
function scheduleEdgeSnap(win) {
  clearEdgeSnap();

  if (Date.now() < suppressEdgeSnapUntil) {
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

const MODE_TRANSITION_MS = 220;
let modeAnimationId = 0;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * Grow or shrink the window around its centre, one eased step per frame.
 * Anchoring both edges to the centre is what makes a capsule collapse into the
 * mini circle in place (the long axis travels further, the short one barely
 * moves) and makes fullscreen bloom outwards.
 */
function animateWindowBounds(win, from, to, onDone) {
  if (modeAnimationId) {
    clearInterval(modeAnimationId);
    modeAnimationId = 0;
  }

  const startedAt = Date.now();

  const step = () => {
    if (win.isDestroyed()) {
      clearInterval(finishedId);
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
      clearInterval(finishedId);
      modeAnimationId = 0;

      if (typeof onDone === 'function') {
        onDone();
      }
    }
  };

  const finishedId = setInterval(step, 16);
  modeAnimationId = finishedId;
  step();
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
function setWindowDisplayMode(win, nextMode) {
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

      // Bloom out to the display, then switch to native fullscreen once the
      // window already covers it (no jump, no second animation).
      animateWindowBounds(win, startBounds, display.bounds, () => {
        if (!win.isDestroyed()) {
          win.setFullScreen(true);
        }
      });
    }

    return true;
  }

  const size = WINDOW_SIZES[nextMode] || WINDOW_SIZES.capsule;
  const restoringFromFullscreen = displayState.mode === 'fullscreen';
  const restore = displayState.restoreBounds;

  displayState.mode = nextMode;

  if (restoringFromFullscreen) {
    win.setFullScreen(false);
    win.setAlwaysOnTop(displayState.wasPinned);
  }

  const bounds = win.getBounds();
  const origin = restoringFromFullscreen && restore ? restore : bounds;

  // Keep the centre still: the widget collapses/expands in place instead of
  // jumping to wherever its top-left corner would land.
  const centerX = origin.x + origin.width / 2;
  const centerY = origin.y + origin.height / 2;
  const position = clampToWorkArea(
    win,
    Math.round(centerX - size.width / 2),
    Math.round(centerY - size.height / 2),
    size.width,
    size.height
  );

  animateWindowBounds(
    win,
    bounds,
    {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height
    }
  );
  suppressEdgeSnapUntil = Date.now() + 600;

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
    title: 'NanoTimer',

    // Frameless + transparent surface.
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    // Do not let Windows add a native WS_THICKFRAME border around the widget.
    thickFrame: false,

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
    win.show();
    win.focus();
  };

  win.once('ready-to-show', reveal);
  win.webContents.once('did-finish-load', () => {
    setTimeout(reveal, 80);
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

  ipcMain.handle('window:set-display-mode', (event, mode) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (!win) {
      return false;
    }

    return setWindowDisplayMode(win, mode);
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
        title: 'Export NanoTimer log',
        defaultPath: typeof suggestedName === 'string' ? suggestedName : 'NanoTimer-log.txt',
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
        : 'NanoTimer';
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

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);

  app
    .whenReady()
    .then(() => {
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

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
