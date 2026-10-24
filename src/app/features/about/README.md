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
- **Leaving.** **Enter Afterlife** (top right) goes to `/fleet`, the **Afterlife** breadcrumb to the front door (`/`).
  Esc follows one of them (`keys/leave.ts`): arriving from the door (its links are `/about?from=door`), Esc goes back
  to `/`; from anywhere else it enters `/fleet`. That link carries `aria-keyshortcuts="Escape"`. On the last beat,
  **Replay it step by step in Theater** goes to `/theater`.
- **Reduced motion.** The intro holds still and then hands over. Nothing plays by itself. Every move is a cut, with no
  travelling light, no sway and no fireflies. A click still steps the beats.
- **Label.** The art carries one corner label, "Stylised illustration". There is no data-mode pill: the status bar
  inside the app says what the data is.

The beats come from the loop, never from the prototype's copy. Each known key (`finding`, `red`, `patch`, `proof`,
`guard`, `gate`, `staging`, `prod`, `summary`) has its own voice and its own emblem. A key the film does not know
takes a voice by its position and a plain emblem.

## Code map

| Path | Role |
|---|---|
| `AboutFilm.tsx` | The client screen: reducer, camera, keys, layout |
| `AboutFrame.tsx` | The static frame shown while the read streams in |
| `data/loadAboutData.ts` | Server read: the loop |
| `model/playback.ts` | The pure playback reducer (intro, scrub, play, tick) |
| `model/road.ts`, `model/camera.ts` | The road (sampled Bézier) and the camera's shot per layer |
| `model/city.ts`, `model/rng.ts` | The seeded night city, merged into a few paths |
| `model/beats.ts` | Beat types, voice per key, kicker |
| `hooks/` | `useFilmCamera` (rAF, intro), `useAutoplay`, `useFilmKeys` |
| `keys/` | `keymap.ts` (the keys Settings lists), `leave.ts` (where Esc leads) |
| `art/` | The SVG scene: defs, backdrop and city layers, road, stations, `emblems/` |
| `components/` | Top bar, intro, caption, timeline, fireflies and their CSS |

The look is the front door's. Type is `--sys` at the `--t-*` sizes; the hierarchy (kicker, headline, body) is size
and weight, never a second family. Text is `--text-1..4`; the bars are the door's dark plate with `--border-*`
hairlines (the top bar's edge is `--edge-glow`), the way in is the door's filled `--accent` button, and focus is
`--ring`. The art's colours are `tokens.css`'s "about film" block (`--film-*`), every one a `color-mix()` of the theme
(cyan on near-black, the door's recipe), so no warm cream or gold is left. The beat voices are theme tokens too. SVG
text is sized in viewBox units, so it scales with the scene.
