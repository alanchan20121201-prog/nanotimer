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
    notifyComplete: (payload) =>
      ipcRenderer.invoke('timer:notify-complete', payload)
  })
);
