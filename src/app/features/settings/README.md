# Settings (D10)

Route `/settings`. One window, one scrolling pane, a sidebar that jumps between sections.

## Parts
- `SettingsScreen.tsx` composes the Window and holds the `SECTIONS` list. To add a setting, add a
  section component and one line there.
- `components/TextSizeSection.tsx` the 3-way control (Smaller / Standard / Larger), the scale table
  from `model/specRows.ts` and a live `SizePreview` made of the real shared parts.
- `components/KeyboardSection.tsx` lists `data/shortcuts.ts` (Cmd or Ctrl with `=` `-` `0`, and `I`).
- `components/AboutSection.tsx` version (`lib/version.ts`) and the honesty note about demo data.

## How the size works
- `html[data-text-size]` switches the variables in `src/styles/text-size.css`.
- `lib/settings/` holds the pure helpers (`textSize.ts`), the store, `useTextSize()`, the inline
  boot script for `<head>` and `TextSizeShortcuts` (mounted once by `app/Providers.tsx`).
- Saved in `localStorage` under `belay.textSize`, always inside try/catch. Default: Standard.

## Tests
`model/specRows.test.ts`; the pure size logic is tested in `lib/settings/textSize.test.ts`.
