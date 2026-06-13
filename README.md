# KRenamer

A desktop app for bulk-renaming files by patterns, built for organizing manga
pages (and any other sequentially numbered files). Pick a folder or loose files,
define a naming pattern with a sequence token, preview the result live, and apply
the rename safely.

Windows-first, but built on a cross-platform stack (Tauri) so macOS/Linux remain
within reach.

## Features

- **Load anything** — pick a folder, pick loose files, or drag & drop onto the
  window. Files are listed in natural order (`Pag_2` before `Pag_10`).
- **Pattern with a sequence token** — use `{n}` in a template, e.g.
  `One Piece 381 - Pag {n} [Español]`, with configurable **start**, zero-padding
  **digits**, and **step**. The original extension is always preserved.
- **Custom start** — merge consecutive chapters by starting the sequence where
  the previous batch ended.
- **Live preview** — a current → new table updates as you type, flagging
  **collisions** (two files would land on the same name, or a name would clobber
  an existing file) and **invalid** names (Windows-forbidden characters).
- **Safe apply** — renames in two phases (source → temp → final) so a target
  that is another file's source is never clobbered (e.g. `001→002, 002→003`).
  Aborts without touching disk if any warning is present.
- **Two themes** — `sumi` (light, editorial) and `terminal` (dark, technical),
  switchable in Settings. Fonts are bundled locally, so it works offline.

## Tech stack

- **[Tauri 2](https://tauri.app/)** — Rust backend + web frontend, small
  cross-platform binaries.
- **React 19 + TypeScript + Vite 7** — frontend.
- **Rust** — the filesystem logic (scan, preview, apply) lives here, fully
  unit-tested.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Tauri's platform prerequisites — see the
  [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)
  (on Windows: WebView2 + the MSVC build tools).

### Install & run

```bash
npm install
npm run dev        # launch the app (Tauri + Vite)
```

### Build a release bundle

```bash
npm run build      # produces the desktop bundle (tauri build)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Launch the full app (Tauri dev) |
| `npm run build` | Build the desktop bundle |
| `npm run lint` | ESLint over `src` |
| `npm run preview` | Vite preview of the built frontend |

Rust tests:

```bash
cd src-tauri
cargo test
```

## How it works

The frontend is presentation; all filesystem logic is in Rust as three commands:

- **`scan(paths)`** — expands folders to their first-level files (no recursion),
  returns entries in natural order.
- **`preview(paths, plan)`** — builds the new names from the pattern and returns
  a per-row table with `invalid` / `collision` flags. Reads disk but never
  writes.
- **`apply(paths, plan)`** — re-validates, then performs the two-phase rename,
  returning a per-file result.

The pure name-building engine (`build_names`) and the collision/apply logic are
covered by unit tests (`cargo test`).

## Project structure

```
src/                 React frontend
  components/         UI components (each with co-located CSS)
  hooks/             useTheme, useFileDrop, useScannedFiles, useLivePreview, useApply
  types/             shared TS types mirroring the Rust structs
  utils/             command wrappers (invoke) and native dialogs
  theme.css          the two-theme CSS-variable system
src-tauri/src/       Rust backend
  fs_ops.rs          scan / preview / apply + FileEntry, PreviewRow, ApplyOutcome
  rename.rs          pure template engine (build_names) + RenamePlan
```

## Roadmap (Phase 2)

Not in the current MVP, planned for later:

- Undo / rename history
- Saved pattern presets
- Recursive subfolder scanning
- Internationalization (i18n)
- Theme persistence and settings moved to a Tauri store

## Versioning

[SemVer](https://semver.org/). Pre-1.0: minor bumps for features, patch for
fixes; a version bump marks a deliverable build, not every commit.
