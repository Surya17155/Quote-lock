# QuoteLock Studio

Desktop app for Windows that designs a quote card and sets it as your lock screen. The Electron UI writes the design to `config.json`; the PowerShell engine (`app.ps1`) generates quotes, renders 1920×1080 PNGs, publishes the lock screen, and keeps a queue topped up from a Windows scheduled task.

## Requirements

- Windows 10/11
- Node.js 20+ and npm
- Microsoft Edge (used as the headless renderer)
- NVIDIA NIM API key

## Run from source

```powershell
cd studio
npm install
npm run dev
```

Production preview of the built UI:

```powershell
npm run build
npm run start
```

## Engine and data

All runtime data lives in `%USERPROFILE%\QuoteLock`:

- `config.json` — settings and API key (never commit this file)
- `queue/`, `shown/`, `lockscreen/` — rendered cards and publish history
- `data/` — log, state, render scratch files
- `shared/` — renderer used by the engine

Install or repair the scheduled task and shortcuts:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File app.ps1 -Setup
```

`app.ps1` also supports `-Generate`, `-Regenerate`, `-Publish <png>`, `-SelfTest`, and `-Gui` for the legacy WinForms settings window.

## Audits

```powershell
npm run audit          # renderer, Studio UI, every page
npm run audit:packaged # installed app smoke test + live publish
```

- `scripts/audit-render.mjs` renders all presets and every appearance control without Electron.
- `scripts/ui-audit.mjs` clicks each palette chip and checks the preview plus saved config.
- `scripts/pages-audit.mjs` visits every page and checks console errors.
- `scripts/publish-packaged.mjs` publishes from the installed app.

## Package a Windows installer
```powershell
cd studio
npm run icon   # build/icon.svg -> build/icon.png -> build/icon.ico
npm run dist
```

Output: `studio/release/QuoteLock Setup <version>.exe`. The NSIS installer is per-user, installs to `%LOCALAPPDATA%\Programs\QuoteLock`, and creates Desktop and Start Menu shortcuts that use the app icon. The `extraResources` step bundles `app.ps1`, `run-hidden.vbs`, and `shared/` into the installer; the packaged app copies them into `%USERPROFILE%\QuoteLock` on launch.

## Secrets

`config.json` is git-ignored. Use `config.example.json` as a template. Do not commit API keys, `data/`, `queue/`, `shown/`, `lockscreen/`, `assets/user/`, or build output.
