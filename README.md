# Focus Loop

A Pomodoro-style focus/relax interval timer built with React + Tauri.

## Features

- Configurable focus time, relax time, and number of loops (or infinite)
- Animated progress ring with phase color-coding
- Audio beeps on phase transitions (Web Audio API)
- Browser notifications
- 4 themes: Dark, Light, Forest, Sunset — persisted via localStorage
- Runs as a native desktop app (no browser, no Node required to run)

## Dev

```bash
npm install
npm run dev             # web only — http://localhost:5173
npm run tauri:dev       # desktop app with hot reload
```

## Build — macOS

```bash
npm run tauri:build
```

Output at `src-tauri/target/release/bundle/macos/`:

| File | Purpose |
|---|---|
| `Focus Loop.app` | Drag into `/Applications` to install |
| `Focus Loop_x.x.x_aarch64.dmg` | Share with others to install |

## Build — Windows

On a Windows machine, install the prerequisites first:

```powershell
# 1. Install Rust
winget install Rustlang.Rustup

# 2. Install Visual Studio C++ Build Tools (required by Tauri)
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"

# 3. Restart terminal, verify
rustc --version
cargo --version

# 4. Clone repo and build
git clone <your-repo-url>
cd focus-loop
npm install
npm run tauri:build
```

Output at `src-tauri\target\release\bundle\`:

| File | Purpose |
|---|---|
| `nsis\Focus Loop_x.x.x_x64-setup.exe` | Installer |
| `msi\Focus Loop_x.x.x_x64_en-US.msi` | MSI package |

> The built app has no dependencies — no Node, no browser needed.
