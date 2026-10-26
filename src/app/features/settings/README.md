# Settings (D10)

Routes `/settings/display`, `/keyboard`, `/data`, `/about`. `/settings` redirects to `/settings/display`; any other
`/settings/x` is the not-found page. Each page renders `SettingsWindow` (heading, one-line lede, content).

## Parts
- `SettingsWindow.tsx` the Window with the sidebar sub-navigation (section "Settings", current from the route via
  `model/settingsNav.ts`). To add a sub-page: one line in `SETTINGS_PAGES` and a `src/app/(app)/settings/<name>/page.tsx`.
- `components/TextSizeSection.tsx` (Display) the 3-way control, its saved / not-saved note (`model/saveNote.ts`), the
  scale table from `model/specRows.ts` and a live `SizePreview`.
- `components/KeyboardSection.tsx` (Keyboard) the global shortcuts from `data/shortcuts.ts`;
  `sections/ScreenKeysSection.tsx` the per-screen keys from `data/screenKeys.ts`, derived from the keymaps the screens'
  hooks bind (`lib/keyboard/keymap.ts`; each screen's `model/.../keymap.ts`, Task's beside `actionFor`). A new key goes
  in its screen's keymap, never in this list; a new screen adds its keymap to `SCREEN_KEYS`.
- `sections/ConnectionSection.tsx` (Data & connection) a server component: mode, fake or real GitLab, host and group id
  from `readDataConfig` / `readConfig`, and the status bar's own label (`StatusLine`). Never reads or shows a token.
- `components/AboutSection.tsx` (About) version (`lib/version.ts`) and every localStorage key from `data/browserKeys.ts`
  (`data/browserKeys.test.ts` fails when a module stores under a key the list does not show).

## How the size works
- `html[data-text-size]` switches the variables in `src/styles/text-size.css`.
- `lib/settings/` holds the pure helpers (`textSize.ts`), the store, `useTextSize()`, the inline
  boot script for `<head>` and `TextSizeShortcuts` (mounted once by `app/Providers.tsx`).
- Saved in `localStorage` under `afterlife.textSize` (a value saved under the pre-rename prefix is moved there once, before first paint: `src/lib/storage`), always inside try/catch. Default: Standard.

## Tests
`model/specRows.test.ts`, `model/settingsNav.test.ts`; the pure size logic is tested in `lib/settings/textSize.test.ts`.
`data/screenKeys.test.ts` holds the derived rows, the Task keymap to `actionFor`, and the server-safety of the import
closure (no `'use client'` module). `sections/ScreenKeysSection.test.tsx` pins one rowgroup header per screen (no empty
`<th>`); `sections/ConnectionSection.test.tsx` the Mode row ("the default" only when `AFTERLIFE_MODE` is unset).
`app/(app)/settings/settingsRoutes.test.ts` checks the route folders against `SETTINGS_PAGES`, the `/settings` redirect, and
each page's tab title ("Afterlife Settings <label>").
`model/specCss.test.ts` reads `src/styles/text-size.css` against `TEXT_SIZE_SPEC` (all 27 measures);
`model/sizeTitles.test.tsx` the size buttons' tooltips from the spec and the default; `model/saveNote.test.ts` the
Display note (saved, or this visit only when the browser refuses to store the size); `data/shortcuts.test.ts` presses
the listed caps through the mounted `TEXT_SIZE_HOTKEYS` (`dispatchHotkey`) and keeps the inspector row qualified while a screen draws no inspector;
`data/browserKeys.test.ts` every key a module stores in localStorage is on the About page.
