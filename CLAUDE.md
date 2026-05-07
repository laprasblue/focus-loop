# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run tauri:dev   # Desktop app with hot reload
npm run build:dmg   # macOS — builds .app then packages DMG via hdiutil
npm run build:exe   # Windows — builds NSIS installer (run on Windows)
npm run lint        # ESLint
```

`dev` and `build` are used internally by Tauri (`beforeDevCommand` / `beforeBuildCommand`) — don't call them directly.

No test suite exists in this project.

## Architecture

**Stack:** React 19 (frontend) + Tauri v2 (native shell) + Rust (thin wrapper). All app logic lives in the frontend — the Rust layer only wires up `tauri-plugin-notification`.

```
src/
  main.jsx      # Entry: imports fontsource fonts, mounts React
  App.jsx       # Entire app — all state, logic, and components in one file
  App.css       # All styles — theme tokens, 8-bit styles, normal mode overrides
  index.css     # Font-family / rendering base; normal mode font override
src-tauri/
  src/lib.rs    # Tauri app setup, plugin registration
  tauri.conf.json
```

## Theming System

Two orthogonal axes, both persisted to `localStorage`:

1. **Color theme** (`data-theme` on `<html>`) — `dark` | `light` | `forest` | `sunset` | `thao`
   - Tokens defined as CSS custom properties at the top of `App.css`
   - `[data-theme="light"]` overrides exist mid-file for ring/HP bar/button colors

2. **Style mode** (`data-style` on `<html>`) — `8bit` | `normal`
   - Base styles are 8-bit (VT323 font, pixel shadows, step() animations, scanlines)
   - `[data-style="normal"]` block at the bottom of `App.css` overrides to glassmorphism, Inter font, smooth transitions

## Timer Logic

All timer state lives in `App`. The `tick` callback runs on a 1-second `setInterval`:
- Reads current state via `stateRef` (avoids stale closures)
- Updates `timeLeft` via `setTimeLeft(prev => ...)` — **side effects (notify, playBeep, setPhase) must NOT go inside the updater**; use a local `pendingNotify` variable and call `notify()` after `setTimeLeft` returns
- Phase transitions: focus → relax → focus, cycling `currentLoop` until `loops` is reached

## Thảo Theme Special Features

When `theme === 'thao'`:
- `<FloatingHearts />` renders floating ♡/♥ particles continuously
- `<Confetti />` renders on session complete (`done === true`)
- `notify()` calls use Vietnamese sweet messages instead of English
- `PLAYER 1` tag in header shows `THẢO ♡`

## Notifications

`IS_TAURI` flag gates between `@tauri-apps/plugin-notification` and the browser Notification API. Permission is requested on first start. Notification text is theme-aware (Thảo theme gets custom messages).

## Fonts

Fonts are self-hosted via `@fontsource/vt323` and `@fontsource/inter` — no Google Fonts CDN call. Imported in `main.jsx`, bundled into `dist/assets/` by Vite.
