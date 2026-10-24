# About: the one-change film

Route `/about`, from `src/app/about/page.tsx`. A port of the onboarding contest's winner
(`belay-onboarding`, sonnet variant 2), its L0 film only. Like the front door, it sits outside the app window.

One change travels a night road from a finding to production. There is one station for each beat of the app's
loop (`DataSource.getLoop()`).

- **Intro.** The light travels the whole route in the wide shot, then the camera comes in on the first beat (about
  3.7 s). Any key or a click skips it. When it ends the film plays by itself, one beat every 4.25 s, and stops on the
  summary.
- **Scrub.** Click a stop on the timeline or a station on the road, or use Left / Right / Home / End. Space plays or
  pauses. Pointing at or focusing a stop previews that beat, ghosted, in the caption.
- **Leaving.** **Enter Afterlife** (top right) and Esc go to `/fleet`. On the last beat, **Replay it step by step in
  Theater** goes to `/theater`.
- **Reduced motion.** The intro holds still and then hands over. Nothing plays by itself. Every move is a cut, with no
  travelling light, no sway and no fireflies. A click still steps the beats.
- **Data mode.** The pill says what the status bar says: `dataLabel` over `readShellInfo`. In demo that is
  "illustrative demo data". In live, the beats stay marked illustrative while the live source serves the loop from
  the demo catalogue (`illustrative` includes `loop`).

The beats come from the loop, never from the prototype's copy. Each known key (`finding`, `red`, `patch`, `proof`,
`guard`, `gate`, `staging`, `prod`, `summary`) has its own voice and its own emblem. A key the film does not know
takes a voice by its position and a plain emblem.

## Code map

| Path | Role |
|---|---|
| `AboutFilm.tsx` | The client screen: reducer, camera, keys, layout |
| `AboutFrame.tsx` | The static frame shown while the read streams in (no pill: the mode is not known yet) |
| `data/loadAboutData.ts` | Server read: the loop and the mode label |
| `model/playback.ts` | The pure playback reducer (intro, scrub, play, tick) |
| `model/road.ts`, `model/camera.ts` | The road (sampled Bézier) and the camera's shot per layer |
| `model/city.ts`, `model/rng.ts` | The seeded night city, merged into a few paths |
| `model/beats.ts` | Beat types, voice per key, kicker |
| `hooks/` | `useFilmCamera` (rAF, intro), `useAutoplay`, `useFilmKeys` |
| `art/` | The SVG scene: defs, backdrop and city layers, road, stations, `emblems/` |
| `components/` | Top bar, intro, caption, timeline, fireflies and their CSS |

Colours come from `tokens.css`, in its "about film" block (`--film-*`, `--serif`). The type sizes are `--t-*`. SVG
text is sized in viewBox units, so it scales with the scene.
