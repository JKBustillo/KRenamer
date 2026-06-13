# CLAUDE.md

Guidance for working in this repo with Claude Code.

## What this is

KRenamer — a Tauri 2 + React 19 + TypeScript desktop app for bulk-renaming files
by patterns (manga pages are the primary use case). All filesystem logic lives in
Rust; the frontend is presentation + command calls.

## Commands

- `npm run dev` — launch the full app (Tauri dev). `dev`/`build` are Tauri, not Vite.
- `npm run build` — desktop bundle (`tauri build`).
- `npm run lint` — ESLint over `src` (run after touching anything under `src/`).
- `npm run preview` — Vite preview of the built frontend.
- Rust tests: `cd src-tauri && cargo test` (or `cargo check` to typecheck fast).

## Architecture

- **Rust backend** (`src-tauri/src/`):
  - `fs_ops.rs` — the three commands `scan`, `preview`, `apply`, plus the
    `FileEntry`, `PreviewRow`, `ApplyOutcome` structs. Commands are registered in
    `lib.rs` via `invoke_handler!`.
  - `rename.rs` — the pure template engine `build_names` + `RenamePlan`. No I/O.
  - `apply` is two-phase (source → unique temp → final) and aborts (returns `Err`)
    if any row is invalid/colliding. `preview` reads disk but never writes.
- **Frontend** (`src/`):
  - `utils/commands.ts` — typed `invoke` wrappers (`scan`/`preview`/`apply`). Don't
    use raw command-name strings in components.
  - `utils/dialog.ts` — native folder/file pickers (Tauri dialog plugin).
  - `hooks/` — `useScannedFiles` (load + scan), `useFileDrop` (Tauri drag-drop),
    `useLivePreview` (debounced preview), `useApply`, `useTheme`.
  - `types/` — TS interfaces that mirror the Rust structs; keep them in sync.
  - `theme.css` — the two-theme CSS-variable system.

## Conventions (important)

- **Commits in English**, no `Co-Authored-By` trailer.
- **App user-facing text in neutral Spanish** — no voseo/regionalisms (UI strings
  and Rust error messages that reach the UI, e.g. `blocking_reason`).
- **Colors only via theme CSS variables** (`var(--bg-primary)`, `var(--accent)`,
  `var(--danger)`, …). Two themes: `sumi` (light, default) and `terminal` (dark);
  nothing hardcoded to one theme. Theme is chosen only in the Settings panel.
- **Fonts bundled locally** (Fontsource, latin subsets) — never a CDN; the app
  must work offline.
- **Rust**: commands `#[tauri::command]` + registered; errors as
  `Result<T, String>` via `.map_err(|e| e.to_string())`; no `unwrap()` on reachable
  paths; new deps added explicitly to `Cargo.toml`; `snake_case`.
- **Versioning** (SemVer): keep `package.json`, `src-tauri/tauri.conf.json`, and
  `src-tauri/Cargo.toml` in sync when bumping. A bump marks a deliverable build,
  not every commit. Pre-1.0: minor for features, patch for fixes.
- **`.claude/` is gitignored** (local skills/settings live there).
- The `react-hooks/set-state-in-effect` lint rule is strict: do async work +
  `setState` in event handlers / dedicated hook callbacks, not synchronously in
  `useEffect`.

## Workflow

This project is built with a `/code-planner` (plan) → `/code-build` (implement +
self-review against a checklist) loop. Each subtask is its own commit, validated
with lint + `cargo test`/`cargo check` + `vite build` before committing.

## Roadmap (Phase 2, not yet built)

Undo/history, saved pattern presets, recursive subfolder scanning, i18n, and
moving settings/persistence to a Tauri store.
