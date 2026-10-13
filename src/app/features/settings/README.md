# Settings (D10)

Routes `/settings/display`, `/keyboard`, `/data`, `/about`. `/settings` redirects to `/settings/display`; any other
`/settings/x` is the not-found page. Each page renders `SettingsWindow` (heading, one-line lede, content).

## Parts
- `SettingsWindow.tsx` the Window with the sidebar sub-navigation (section "Settings", current from the route via
  `model/settingsNav.ts`). To add a sub-page: one line in `SETTINGS_PAGES` and a `src/app/settings/<name>/page.tsx`.
- `components/TextSizeSection.tsx` (Display) the 3-way control, the scale table from `model/specRows.ts` and a live `SizePreview`.
- `components/KeyboardSection.tsx` (Keyboard) the global shortcuts from `data/shortcuts.ts`;
  `sections/ScreenKeysSection.tsx` the per-screen keys from `data/screenKeys.ts` (mirror the screens' `useXKeys` hooks).
- `sections/ConnectionSection.tsx` (Data & connection) a server component: mode, fake or real GitLab, host and group id
  from `readDataConfig` / `readConfig`, and the status bar's own label (`StatusLine`). Never reads or shows a token.
- `components/AboutSection.tsx` (About) version (`lib/version.ts`) and the storage key.

## How the size works
- `html[data-text-size]` switches the variables in `src/styles/text-size.css`.
- `lib/settings/` holds the pure helpers (`textSize.ts`), the store, `useTextSize()`, the inline
  boot script for `<head>` and `TextSizeShortcuts` (mounted once by `app/Providers.tsx`).
- Saved in `localStorage` under `belay.textSize`, always inside try/catch. Default: Standard.

## Tests
`model/specRows.test.ts`, `model/settingsNav.test.ts`; the pure size logic is tested in `lib/settings/textSize.test.ts`.
