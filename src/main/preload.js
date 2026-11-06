'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Keep these channel names in sync with registerWindowIpc() in main.js.
// A sandboxed preload cannot require arbitrary local modules, so the two
// small IPC surface definitions intentionally live side by side.
contextBridge.exposeInMainWorld(
  'capsuleTimer',
  Object.freeze({
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    getWindowPosition: () => ipcRenderer.invoke('window:get-position'),
    getWindowBounds: () => ipcRenderer.invoke('window:get-bounds'),
    setWindowPosition: (x, y, width, height) =>
      ipcRenderer.invoke(
        'window:set-position',
        Number(x),
        Number(y),
        width === undefined ? undefined : Number(width),
        height === undefined ? undefined : Number(height)
      ),
    getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
    setAlwaysOnTop: (pinned) =>
      ipcRenderer.invoke('window:set-always-on-top', Boolean(pinned)),
    setDisplayMode: (mode) =>
      ipcRenderer.invoke('window:set-display-mode', String(mode)),
    // Tells the main process that the user is holding the panel, so the edge
    // snap does not fight the drag by firing while the pointer is still down.
    setDragging: (dragging) =>
      ipcRenderer.send('window:drag-state', Boolean(dragging)),
    pickAudio: () => ipcRenderer.invoke('audio:pick'),
    loadAudio: (filePath) => ipcRenderer.invoke('audio:load', String(filePath)),
    pickBackground: () => ipcRenderer.invoke('background:pick'),
    loadBackground: (token) => ipcRenderer.invoke('background:load', String(token)),
    exportLog: (text, suggestedName) =>
      ipcRenderer.invoke('notes:export', String(text), String(suggestedName)),
    onExitFullscreen: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }

      const listener = () => callback();
      ipcRenderer.on('window:exit-fullscreen', listener);

      return () => ipcRenderer.removeListener('window:exit-fullscreen', listener);
    },
    // Tray tooltip and menu language. Both are fire-and-forget: the renderer
    // never waits on them and they cannot fail in a way the UI must handle.
    updateTray: (text) => ipcRenderer.send('tray:update', String(text)),
    setLanguage: (language) => ipcRenderer.send('app:language', String(language)),
    onGlobalAction: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }

      const listener = (_event, action) => callback(String(action));
      ipcRenderer.on('timer:global-action', listener);

      return () =>
        ipcRenderer.removeListener('timer:global-action', listener);
    },
    checkForUpdate: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: (url, name) =>
      ipcRenderer.invoke('update:download', String(url), String(name || '')),
    installUpdate: (filePath) =>
      ipcRenderer.invoke('update:install', String(filePath)),
    onUpdateProgress: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }

      const listener = (_event, progress) => callback(progress);
      ipcRenderer.on('update:progress', listener);

      return () => ipcRenderer.removeListener('update:progress', listener);
    },
    notifyComplete: (payload) =>
      ipcRenderer.invoke('timer:notify-complete', payload)
  })
);
