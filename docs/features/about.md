# About (`/about`)

> What is Afterlife? One change, from a finding to production, without a click.

## What it does
- A full-bleed film outside the app window (like the front door): a night city with the nine beats of the loop
  (finding, red test, patch, Proof Block, guardrail, tier gate, staging, production, summary) drawn as stations on one
  road. A light travels the road; each beat's label and line come from the loop the data source serves.
- A skippable intro (any key or click; it hands over by itself after about 4 s), then autoplay with a hold per beat.
  The timeline scrubs by click, Left/Right and End; Space plays and pauses. The last beat offers **Replay it step by
  step in Theater** (`/theater`). **Enter Afterlife** and Esc go to `/fleet`.
- The pill names the real data mode; in demo the beats are illustrative, and the art is labelled stylised.
- Reduced motion: no travelling light and no autoplay; a click on a stop cuts to that beat.
- Entry points: the front door's **What is this?** link and its **Screens** menu.

## How it works
- `src/app/about/page.tsx` prerenders the frame; `AboutRead` awaits `connection()` inside `<Suspense>` and calls
  `loadAboutData(ds, env)` (`src/app/features/about/data/`): `getDataSource().getLoop()` plus the mode label.
- `model/playback.ts` is the film's pure reducer; `hooks/useFilmCamera` writes each animation frame through data
  attributes on the SVG (never React state); `art/` draws the scene, one component per layer, `art/emblems/` the nine
  beat emblems. Colours are the `--film-*` tokens and `--serif` in `src/styles/tokens.css`.
- Origin: the owner-chosen variant of the `belay-onboarding` contest (2026-10-24), its first level only.
