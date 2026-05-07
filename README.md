# Focus Loop

A Pomodoro-style focus/relax interval timer built with React + Tauri.

## Dev

```bash
npm install
npm run tauri:dev   # desktop app with hot reload
```

## Build

**macOS** (requires `hdiutil`, built into macOS):
```bash
npm run build:dmg
```
Output: `Focus Loop_1.0.0.dmg` in project root.

**Windows** (run on a Windows machine):
```bash
npm run build:exe
```
Output: `src-tauri\target\release\bundle\nsis\Focus Loop_1.0.0_x64-setup.exe`

### Windows prerequisites

```powershell
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```
