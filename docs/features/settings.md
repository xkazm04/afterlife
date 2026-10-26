# Settings (`/settings/display`, `/keyboard`, `/data`, `/about`)

> How large should the interface be on this device, and which keys change it?

## What it does
- Four routed sub-pages (Display, Keyboard, Data & connection, About) in one window; the sidebar lists them and marks
  the current one from the route. `/settings` redirects to `/settings/display`.
- Text size: a 3-way segmented control (Smaller / Standard / Larger), a note saying whether the choice was saved or
  applies for this visit only (`model/saveNote.ts`: the browser refused to store it), a table of what each size sets,
  and a live preview built from real shared parts (`StateGlyph`, `TierChip`, `FeedAge`, `KeyValue`) so it restyles as
  you choose.
- Keyboard: lists the shortcuts with Mac and Windows/Linux key caps: Cmd/Ctrl `=` larger, `-` smaller, `0` standard,
  `I` toggle the inspector (on a screen that has one), then the keys each screen adds (`data/screenKeys.ts`, derived
  from the keymaps the screens bind).
- Data & connection: the data mode, fake or real GitLab, host and group id, read from the server's environment, and
  what the status bar says about the data (`sections/StatusLine.tsx`, the status bar's own `dataLabel`).
- About: the app version (`lib/version.ts`) and every key Afterlife keeps in this browser's localStorage
  (`data/browserKeys.ts`). What the data is lives on Data & connection.
- The subtitle is the sub-page's name; the status bar says where that page's values live (`status` in
  `SETTINGS_PAGES`: saved in this browser, read only, or read from the server's environment).

## How it works
- `app/(app)/settings/page.tsx` only redirects to `/settings/display`; each `app/(app)/settings/<name>/page.tsx` renders
  `SettingsWindow` (heading, lede, content). Only Data & connection reads server data.
- `SettingsWindow.tsx` takes its sidebar from `SETTINGS_PAGES` (`model/settingsNav.ts`); adding a sub-page is one line
  there plus a `src/app/(app)/settings/<name>/page.tsx`, and adding a setting is a `SettingsSection` on its page.
- The current size is the `data-text-size` attribute on `<html>`. `src/styles/text-size.css` defines one block of
  variables per size (`--t-body`, `--t-head`, `--t-small`, `--row-h`, `--hdr-h`, `--tb-h`, `--sb-h`, `--sbw`, `--iw`,
  `--ui-scale`) and derives control metrics from `--ui-scale` (`--ctl-h`, `--seg-h`, `--lozenge-h`, `--mini-h`,
  `--chip-h`, `--sum-h`, `--ico`, `--t-title`). Components size from these variables, never from literal px.
- `lib/settings/textSize.ts` (pure): `TEXT_SIZES`, `TEXT_SIZE_SPEC` (the D10 table), `parseTextSize`, `stepTextSize`
  (clamped), `TEXT_SIZE_KEYS` (`=`/`+`, `-`/`_`, `0`), `applyIntent`, `writeStoredTextSize` (try/catch), and
  `bootScriptSource`.
- `TextSizeBoot` puts that inline script in `<head>` (from `app/layout.tsx`): it sets the attribute from
  `localStorage` before first paint, so there is no flash of the wrong size. The `<html>` element starts at `standard`
  with `suppressHydrationWarning`.
- `textSizeStore.ts` treats the DOM attribute as the single source of truth and exposes it to React via
  `useSyncExternalStore` (`useTextSize`); it also follows `storage` events, so another tab's change applies here. It
  keeps whether this browser keeps the size (`useTextSizeSaved`): the last write's answer, whoever made it (Display, a
  shortcut), else on load whether `localStorage` holds the size on screen. Display's saved / not-saved note reads it.
- `TextSizeShortcuts` (mounted once in `app/Providers.tsx`) binds `TEXT_SIZE_HOTKEYS` (Cmd/Ctrl plus each of
  `TEXT_SIZE_KEYS`; Alt chords ignored) app-wide through `useHotkeys`,
  which cancels the browser's own zoom for those chords.
- `model/specRows.ts` turns `TEXT_SIZE_SPEC` into the table rows (body/header/small, row/header row, toolbar/status
  bar, sidebar, drawn-part scale).

## Rules it keeps
- Anything missing, unknown or corrupt in storage reads as Standard; a blocked or throwing store never breaks the UI
  (every read and write is in try/catch, and the boot script is wrapped too).
- The setting is per device and per browser only; nothing is sent to a server.
- `styles/text-size.css` is the source of truth for sizes; `TEXT_SIZE_SPEC` mirrors it for display.

## Scales (from `TEXT_SIZE_SPEC`)
| | Smaller | Standard (default) | Larger |
|---|---|---|---|
| Body / header / small | 13 / 12 / 11 px | 15 / 14 / 13 px | 17 / 16 / 14 px |
| Row / header row | 22 / 24 px | 26 / 28 px | 30 / 32 px |
| Toolbar / status bar | 52 / 22 px | 56 / 26 px | 60 / 28 px |
| Sidebar | 200 px | 224 px | 248 px |
| Drawn parts (`--ui-scale`) | 1x | 1.15x | 1.3x |

Smaller is the original prototype size.

## Code map
| Path | Role |
|---|---|
| `src/app/(app)/settings/page.tsx` | Redirect to `/settings/display` |
| `src/app/(app)/settings/<name>/page.tsx` | One sub-page route each |
| `src/app/features/settings/SettingsWindow.tsx` | `Window` + sidebar from `SETTINGS_PAGES` |
| `.../settings/model/settingsNav.ts` | Sub-page list and current-page match |
| `.../settings/components/TextSizeSection.tsx` | Segmented control, scale table, preview |
| `.../settings/components/SizePreview.tsx` | Sample table row, tier chip and inspector line |
| `.../settings/components/KeyboardSection.tsx`, `data/shortcuts.ts` | Global shortcut list |
| `.../settings/sections/ScreenKeysSection.tsx`, `data/screenKeys.ts` | Per-screen keys, derived from the screens' keymaps |
| `.../settings/sections/ConnectionSection.tsx`, `StatusLine.tsx` | Data & connection (server component) and the status bar's label |
| `.../settings/components/AboutSection.tsx`, `data/browserKeys.ts` | Version and every localStorage key |
| `.../settings/model/saveNote.ts` | Display's saved / not-saved note |
| `.../settings/components/SettingsSection.tsx` | Section wrapper with anchor id |
| `.../settings/model/specRows.ts` | Scale table rows |
| `src/lib/settings/textSize.ts` | Pure size helpers and boot script source |
| `src/lib/settings/textSizeStore.ts`, `useTextSize.ts` | DOM-attribute store and hook |
| `src/lib/settings/TextSizeBoot.tsx`, `TextSizeShortcuts.tsx` | Head script; global chords |
| `src/styles/text-size.css` | The three variable sets and derived metrics |

## Tests
- `model/specRows.test.ts`: reproduces the D10 table for all three sizes; `model/specCss.test.ts` reads
  `src/styles/text-size.css` against `TEXT_SIZE_SPEC`; `model/sizeTitles.test.tsx` the size buttons' tooltips;
  `model/saveNote.test.ts` the saved / not-saved note; `model/settingsNav.test.ts` the current-page match.
- `data/shortcuts.test.ts` presses the listed caps through the real matcher; `data/screenKeys.test.ts` the derived
  per-screen rows and the server-safety of their imports; `data/browserKeys.test.ts` every key a module stores is
  listed. `sections/ScreenKeysSection.test.tsx` and `sections/ConnectionSection.test.tsx` render those sections.
- `src/app/(app)/settings/settingsRoutes.test.ts`: the route folders against `SETTINGS_PAGES`, the redirect, the tab titles.
- `src/lib/settings/textSize.test.ts`: parsing defaults to Standard, step clamping, Cmd/Ctrl intents (bare keys and
  Alt chords ignored), storage read/write surviving missing, corrupt or throwing stores, and the boot script setting
  the attribute only for a valid saved value inside try/catch; `textSizeStore.test.ts` the store.

## Status and limits
- Text size is the only real setting; Keyboard, Data & connection and About are read-only.
- No server-side persistence and no per-user sync: a new browser starts at Standard.
- The global shortcut list (`data/shortcuts.ts`) is static data, pinned by a test to the real key matcher; the
  per-screen keys are derived from the keymaps the screens bind.
