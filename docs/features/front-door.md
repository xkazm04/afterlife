# Front door (`/`)

> How is the whole fleet doing, and where should I go in?

## What it does
- Draws the fleet as a city at night: each GitLab group is a district plate, each project a tower whose height grows
  with its armed tracks and whose class windows are coloured by tier, and each project with waiting decisions sends up
  an amber beam.
- A page load opens on the entrance: treasure gates over the city whose lock is the Belay knot (`components/entrance/`).
  They open by themselves after about 2.2 s, or at once on any key or click; `?entrance=off`, reduced motion and a
  client-side return from the app go straight to the city.
- L0 (fleet): the answer block on the left reads in one order. First the one loud number (decisions waiting) and its
  words; then one wrapping row of filter chips: five marks (stale, classes quarantined, setting up, not watched,
  watching) plus two shown only when non-zero (classes with no record yet, classes split between agents); then a
  rule; then the stats: who holds the most, and a link ("N in improvement cycles · +M rungs since day 0") to
  `/cycles`. Pointing at a chip lights its towers; clicking it locks it as the filter: the chip shows pressed with a
  ✕, and clicking it again or Esc lets it go. The big number opens the district that holds the most decisions. The
  week's proofs are not on the answer (Fleet says them; the readout and L2 say a project's).
- L1 (district): the camera frames one district, the others fade, and the rail lists who needs you (most first),
  stale, setting up and not watched projects, each saying why, then how many are calm. The tier legend is a "?" beside the
  rail's title, opening downward on hover or focus. Exits: Enter Afterlife (`/fleet`), Needs you, Ladder, and Setup
  when a district has projects setting up or not watched.
- L2 (project): a cutaway tower lifts out. A floor per listed stage (nine today), each lit by its rung (dashed when unknown), windows carry tier
  letters, the antenna is the feed and the roof beacon is its decisions. The side panel shows state and numbers; for
  the deep project it adds the cockpit lines, its decisions and its tracks. Exits go to Needs you, Ladder, Maturity,
  Task, Theater or Setup depending on the project.
- Esc and Back go up a level (Esc lets a locked filter go first); Tab, Enter and Space work at every level. **Enter
  Afterlife** in the top chrome goes to `/fleet`; **What is this?** on the brand plate opens `/about?from=door`. There
  is no screens menu.

## How it works
- The root layout's `<head>` renders `DoorFitBoot` (`components/chrome/FitBoot.tsx`): the inline script from
  `model/fit.ts` (`stageFitSource()`), which fits the 1600 x 1000 stage into the viewport and applies the stored render
  tier before first paint. `src/app/(door)/page.tsx` (server) reads `?entrance` and renders `DoorScreen` with
  `loadDoorData()` inside `<Suspense>`, whose prerendered fallback is `DoorFrame`, a still frame (ground, horizon,
  brand plate, hero mark), never a skeleton; there is no `loading.tsx`.
- `data/loadDoorData.ts` reads the DataSource once (`getFleet`, `getPortfolio`, `getCockpit`, `getStages`,
  `getNeedsYou`, `getTracks`, `deepProjectId`) into `DoorData`; live mode lists the group's own decisions only
  (`ownDecisions`), as `/needs-you` does. `cycles` comes from `loadEstateData()`, so it counts what `/cycles` counts:
  every project with a closed cycle, and their net rungs.
- Pure model (`model/`):
  - `city.ts`: `districtsOf(groups, projects)` lays out the 2:1 isometric lattice (four districts in front, three
    behind), `towerH` (height from armed tracks), `needsOf` (0 for a not-set-up project), paint and depth order.
  - `shapes.ts`: path strings for towers (`towerShape`, windows of one tier share one path), plates, beams
    (`beamsOf`), district glows and hover brackets.
  - `ground.ts`: `groundOf(seed)` builds the seeded circuit ground and skyline as a handful of path strings.
  - `camera.ts`: `frameDistrict`, `frameTower`, `onStage`, and `cityTransform` / `groundTransform` (ground at half the
    travel for parallax) as CSS transform strings.
  - `cutaway.ts`: `cutawayOf(project, classes, stages)` for the L2 tower.
  - `words.ts`: tone-tagged text parts: `projectLine`, `districtLine`, `staleText`, `topTiers`, `fleetTotals`,
    `MARK_TEST` (which towers each mark lights), `towerLabel` (accessible name).
- `hooks/useDoor.ts` is the level state machine (level, open district/project, hover, lit mark, camera target,
  intro). Each transition sets a new camera target; a CSS transition does the moving.
- Rendering cost is kept low on purpose: static cached SVG layers per district, one beams SVG, compositor-driven
  camera, `hooks/useStill` pauses ambient motion after 15 s idle, and `hooks/useQuality` times about 1.6 s of intro
  frames and sets `html[data-door-q="lite"]` on slow machines (`?quality=full|lite` forces and remembers a tier).

## Rules it keeps
- Unknown is never zero: a not-set-up project reads "not watched · unknown, not zero", its L2 numbers all say
  "unknown", missing proofs read "proofs unknown", missing demotions "unknown", unknown stage rungs are counted and
  shown as unknown, and unknown class tiers are counted separately.
- Not-set-up projects contribute 0 to the decision count and are not counted as quarantined.
- Stale projects say why and how old (`staleText`: feed error, last good poll age); their decision counts are marked
  "last known".
- Seeded items are labelled: the deep project's CRA sign-off reads "seeded drill" and the seeded `!44` decision reads
  "seeded".
- The page is read-only: it writes nothing to the server or GitLab, it only links into the app. The one thing it
  stores is the measured render tier, in the browser's localStorage.

## Code map
| Path (under src/app/features/door/) | Role |
|---|---|
| `DoorScreen.tsx` | Composes scene, answer, labels, readout, rail (L1), L2 view and chrome; defines `DoorData` |
| `data/loadDoorData.ts` | Server loader through the DataSource |
| `model/city.ts` | District and tower layout on the isometric lattice |
| `model/shapes.ts` | Tower, plate, beam, glow and bracket path strings |
| `model/ground.ts` | Seeded ground and skyline paths |
| `model/camera.ts` | Camera framing and CSS transforms |
| `model/cutaway.ts` | L2 cutaway geometry |
| `model/words.ts` | Readout and answer text, fleet totals, mark tests |
| `model/fit.ts` | Inline pre-paint script: stage fit and render tier |
| `hooks/useDoor.ts` | Level state machine and camera targets |
| `hooks/useQuality.ts`, `useStill.ts`, `useStageFit.ts`, `useCountUp.ts` | Render tier probe, idle pause, resize fit, count-up |
| `components/scene/` | City layers: `Scene`, `District`, `Ground`/`Pulses`, `Beams`/`SetupLights`/`HoverMarks`, `SceneDefs` |
| `components/ui/` | `Answer`, `Labels`, `Readout`, `Parts`, `TierLetter`, `MarkIcon` |
| `components/rail/` | `Rail` (L1 district list and exits), `LegendHint` (the tier legend beside its title) |
| `components/l2/` | `L2View`, `L2Tower`, `L2Panel` (project cutaway and panel) |
| `components/chrome/` | `TopChrome` (brand, What is this?, Enter), `BottomChrome` (crumbs, Back), `Splash`, `DoorFrame` (the still frame), `DoorFitBoot` |
| `components/entrance/` | `Entrance` and the treasure gates (`gates/`): the overlay a page load opens on |

## Tests
- `model/door.test.ts`: every project placed once with four districts in front and three behind; back-to-front paint
  order with the most decisions at the front; one beam per waiting project and a glow per waiting district; a tower
  drawn in about ten nodes; the ground is a handful of paths and deterministic; the answer's fleet counts; stale and
  unknown said in words; a district framed inside the stage with the ground at half speed. `model/standing.test.ts`:
  no record yet and split are never a quarantine; names sort in one collation.
- `data/loadDoorData.live.test.tsx`: live over the seeded index, the door, Fleet, Monitor and `/needs-you` list the
  same decisions and the cycles line counts what `/cycles` counts; demo keeps all five decisions.
- `hooks/*.test.ts`: the count-up, the render-tier probe, the stage fit and the idle pause.
- `__tests__/` (the answer's order and its locked chip, tier cells, empty fleet, L2 rungs, rail rows, scene focus) and
  `__tests__/proofs/` (city fit, gates fail-safe and clock, inconclusive proofs, L2 class focus, quarantine parity,
  readout); `components/ui/labels/Labels.test.tsx` beside the labels.

## Status and limits
- Data comes from `getDataSource()` (`src/server/data`): the demo fixture by default (`BELAY_MODE=demo`), or the live
  index snapshot (`BELAY_MODE=live`). In live mode the cockpit text and tracks are still the demo catalogue.
- The deep-project panel (cockpit, decisions, tracks) exists only for `deepProjectId()` (default `ledgerline`).
- Two deliberate departures from the contest winner for render cost: the city at L2 is dimmed, not blurred, and the
  beams breathe as one layer-wide pulse.
