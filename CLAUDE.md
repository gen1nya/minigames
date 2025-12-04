# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- `npm run dev` - Start development mode (runs Vite dev server and Electron concurrently)
- `npm run build` - Build for production (compiles TypeScript and builds Vite)
- `npm start` - Build and run the Electron app
- `npm run preview` - Preview production build with Vite

## Architecture

This is an Electron application using a dual-process architecture with TypeScript, React, and Vite.

### Process Separation

**Main Process** (`src/main.ts`, `src/preload.ts`)
- Compiled with `tsconfig.node.json` to CommonJS (`dist/`)
- `main.ts`: Electron app lifecycle and BrowserWindow management
- `preload.ts`: Exposes `window.electronAPI` with IPC channels (`toMain`, `fromMain`) and version info

**Renderer Process** (`src/renderer/`)
- Compiled with Vite to `dist/renderer/`
- React 19 with styled-components for styling
- Type definitions for Electron API in `types/electron.d.ts`

### IPC Communication

The preload script exposes a validated IPC interface:
- `electronAPI.sendMessage(channel, data)` - sends to main (allowed: `toMain`)
- `electronAPI.onMessage(channel, callback)` - receives from main (allowed: `fromMain`)
- `electronAPI.versions` - node/chrome/electron version info

### Development vs Production

- Dev: Loads `http://localhost:5173` with DevTools open
- Prod: Loads `dist/renderer/index.html`
