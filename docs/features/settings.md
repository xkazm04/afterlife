# Settings (`/settings`)

> How large should the interface be on this device, and which keys change it?

## What it does
- One window with one scrolling pane and a sidebar (Text size, Keyboard, About) that scrolls to each section and marks
  the current one.
- Text size: a 3-way segmented control (Smaller / Standard / Larger), a table of what each size sets, and a live
  preview built from real shared parts (`StateGlyph`, `TierChip`, `FeedAge`, `KeyValue`) so it restyles as you choose.
- Keyboard: lists the shortcuts with Mac and Windows/Linux key caps: Cmd/Ctrl `=` larger, `-` smaller, `0` standard,
  `I` toggle the inspector.
- About: the app version (`lib/version.ts`), an "illustrative demo data" honesty chip, and the storage key
  `belay.textSize`.
- The subtitle reads "This device"; the status bar reads "Settings are saved in this browser".

## How it works
- `app/settings/page.tsx` renders `SettingsScreen`; it reads no server data.
- `SettingsScreen.tsx` holds `SECTIONS` (`{id, label, node}`); adding a setting is one section component and one line
  there.
- The current size is the `data-text-size` attribute on `<html>`. `src/styles/text-size.css` defines one block of
  variables per size (`--t-body`, `--t-head`, `--t-small`, `--row-h`, `--hdr-h`, `--tb-h`, `--sb-h`, `--sbw`, `--iw`,
  `--ui-scale`) and derives control metrics from `--ui-scale` (`--ctl-h`, `--seg-h`, `--lozenge-h`, `--mini-h`,
  `--chip-h`, `--sum-h`, `--ico`, `--t-title`). Components size from these variables, never from literal px.
- `lib/settings/textSize.ts` (pure): `TEXT_SIZES`, `TEXT_SIZE_SPEC` (the D10 table), `parseTextSize`, `stepTextSize`
  (clamped), `textSizeIntent` (Cmd/Ctrl + `=`/`+`, `-`/`_`, `0`; Alt chords ignored), `applyIntent`,
  `readStoredTextSize` / `writeStoredTextSize` (try/catch), and `bootScriptSource`.
- `TextSizeBoot` puts that inline script in `<head>` (from `app/layout.tsx`): it sets the attribute from
  `localStorage` before first paint, so there is no flash of the wrong size. The `<html>` element starts at `standard`
  with `suppressHydrationWarning`.
- `textSizeStore.ts` treats the DOM attribute as the single source of truth and exposes it to React via
  `useSyncExternalStore` (`useTextSize`); it also follows `storage` events, so another tab's change applies here.
- `TextSizeShortcuts` (mounted once in `app/Providers.tsx`) binds the Cmd/Ctrl chords app-wide through `useHotkeys`,
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
| `src/app/settings/page.tsx` | Route |
| `src/app/features/settings/SettingsScreen.tsx` | `Window` + sidebar + `SECTIONS` |
| `.../settings/components/TextSizeSection.tsx` | Segmented control, scale table, preview |
| `.../settings/components/SizePreview.tsx` | Sample table row, tier chip and inspector line |
| `.../settings/components/KeyboardSection.tsx`, `data/shortcuts.ts` | Shortcut list |
| `.../settings/components/AboutSection.tsx` | Version, data honesty chip, storage key |
| `.../settings/components/SettingsSection.tsx` | Section wrapper with anchor id |
| `.../settings/model/specRows.ts` | Scale table rows |
| `src/lib/settings/textSize.ts` | Pure size helpers and boot script source |
| `src/lib/settings/textSizeStore.ts`, `useTextSize.ts` | DOM-attribute store and hook |
| `src/lib/settings/TextSizeBoot.tsx`, `TextSizeShortcuts.tsx` | Head script; global chords |
| `src/styles/text-size.css` | The three variable sets and derived metrics |

## Tests
- `model/specRows.test.ts`: reproduces the D10 table for all three sizes.
- `src/lib/settings/textSize.test.ts`: parsing defaults to Standard, step clamping, Cmd/Ctrl intents (bare keys and
  Alt chords ignored), storage read/write surviving missing, corrupt or throwing stores, and the boot script setting
  the attribute only for a valid saved value inside try/catch.

## Status and limits
- Text size is the only real setting; Keyboard and About are read-only.
- No server-side persistence and no per-user sync: a new browser starts at Standard.
- The shortcut list is static data and is not generated from the bound hotkeys.
