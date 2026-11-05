# NanoTimer

A frameless, transparent countdown / stopwatch that floats on your desktop. Built with Electron — no UI framework, no build step for the renderer.

![CI](https://github.com/USERNAME/NanoTimer/actions/workflows/ci.yml/badge.svg)

## Features

- **Countdown and stopwatch** with hour / minute / second fields, validation, pause and resume.
- **Four display modes** — setup card, capsule pill, mini circle, fullscreen focus stage.
- **Custom background image that works in every mode**: the photo is painted inside the card, the capsule pill, the mini circle and the fullscreen stage, always behind a contrast scrim so text and buttons stay readable.
- **Custom completion sound** plus a mute toggle; the alarm loops until you stop it.
- **Focus notes and TXT export** — sessions are logged locally and exported as escaped TSV with local timestamps.
- **Presets, edge snapping, always-on-top pin, four UI languages** (English, 繁體中文, 简体中文, 日本語).
- **Accessibility** — `aria-live` announcements, keyboard shortcuts, reduced-motion support, visible focus rings.

## Display modes

| Mode | What it looks like | How to reach it |
| --- | --- | --- |
| Setup | 420×330 card with the form | default, or *New timer* |
| Capsule | small pill that expands on hover into the control panel | *Start* |
| Mini | 96 px progress circle, click to return to capsule | mode select in the capsule panel, or `M` |
| Fullscreen | edge-to-edge focus stage | mode select, or `F` |

## Requirements

- Node.js **20 or newer**
- Windows, macOS or Linux for development; packaging is configured for Windows x64

## Getting started

```bash
git clone https://github.com/USERNAME/NanoTimer.git
cd NanoTimer
npm install
npm start
```

`npm start` launches Electron from source through `scripts/start.js`, which also applies the Windows workaround described under [Troubleshooting](#troubleshooting).

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` / `npm run dev` | Run the app from source |
| `npm run check` | Syntax-check every JavaScript file |
| `npm test` | Run the unit tests (`node --test`) |
| `npm run pack` | Build an unpacked app into `dist/win-unpacked` |
| `npm run package:win` | `pack` plus the sandbox-safe launcher |
| `npm run dist` | Single-file portable `.exe` |

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Pause / resume |
| `R` or `Esc` | Reset (press twice — the first press shows a confirmation hint) |
| `F` | Toggle fullscreen |
| `M` | Toggle mini mode |
| `Shift` + `M` | Mute / unmute the alarm |

## Where your data lives

Settings and imported files live in Electron's `userData` directory. A packaged build keeps them in `NanoTimerData/` next to the executable (portable behaviour); during development they end up under `node_modules/electron/dist/NanoTimerData`.

```
NanoTimerData/
├─ alerts/        # imported completion sounds (32-hex token + extension)
└─ backgrounds/   # imported background images (32-hex token + extension)
```

Preferences — language, presets, last configuration, logs, mute state, background token — live in `localStorage` under `nanotimer.*` keys.

## Building for Windows

```bash
npm run pack        # dist/win-unpacked/NanoTimer.exe
npm run package:win # also builds the launcher that retries with --no-sandbox
npm run dist        # dist/NanoTimer-<version>-portable.exe
```

Add `build/icon.ico` and point `build.win.icon` at it to replace the default Electron icon.

## Project structure

```
src/
├─ main/
│  ├─ main.js        # windows, IPC, display modes, audio + background imports
│  ├─ preload.js     # frozen contextBridge surface
│  └─ window-snap.js # pure edge-snapping helper (unit tested)
├─ renderer/
│  ├─ index.html
│  ├─ renderer.js    # UI state, timers, i18n, export, background
│  └─ styles.css
├─ launcher/         # optional C# launcher (sandbox-safe start)
scripts/
├─ start.js
├─ make-launcher.ps1
└─ diagnostics/      # Windows troubleshooting helpers
test/
└─ window-snap.test.js
```

**Security posture:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, a restrictive CSP, denied window.open and navigation, and every renderer-initiated file import is copied into `userData` and addressed by an opaque token instead of a filesystem path.

## Troubleshooting

**The packaged exe exits immediately (exit code `0x80000003` / `-2147483645`).**
Electron 45 on Windows 11 build 26200 and newer aborts during startup with `STATUS_BREAKPOINT`. `scripts/start.js` sets `ELECTRON_DISABLE_SANDBOX=1` on those builds, and the launcher produced by `npm run package:win` retries with `--no-sandbox`. If a shortcut points straight at `NanoTimer.exe`, add `--no-sandbox` to its arguments.

**SmartScreen says "Windows protected your PC".**
The binaries are unsigned. Choose *More info → Run anyway*, or sign your build.

**ACL / `icacls` errors on first launch.**
See `scripts/diagnostics/fix-nanotimer-acl.cmd` and `scripts/diagnostics/diagnose-nanotimer.ps1`.

## License

[MIT](LICENSE)
