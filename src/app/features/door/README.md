# Front door

Route `/`, from `src/app/(door)/page.tsx`. This is the port of the front-door contest's winner,
"Night Shift" (contest `afterlife-front-door`, A/1). The whole fleet is a city at night:

- each group is a district plate;
- each project is a tower, whose height grows with its armed tracks and whose class windows are
  coloured by tier;
- each waiting decision is an amber beam.

It sits outside the app window. **Enter Afterlife** goes to `/fleet`, and **Screens** lists every
route.

The page loads its data on the server (`data/loadDoorData.ts`, through the DataSource, so it works
in demo and live mode). An inline script (`model/fit.ts`) fits the 1600 x 1000 stage before first
paint. `(door)/loading.tsx` shows the night ground and the brand while the city streams in.

## Levels

- **L0, the fleet:** the answer block (the amber 115, who holds the most, five marks that light
  their towers), a label per district, and the readout for whatever the pointer is on.
- **L1, a district:** the camera frames it, the other districts fade, and the rail lists who needs
  you, what is stale, what is setting up and what is not watched.
- **L2, a project:** the cutaway lifts from its tower. Floors are lit by stage rung, windows show
  tier letters, the antenna is the feed and the beacon is its decisions. The panel shows the
  numbers, plus the decisions and tracks for ledgerline.
- **Moving between levels:** Esc and Back go up a level. Tab, Enter and Space work at every level.

## Why it is cheap to render: the owner's condition on the win

The owner's verdict was "perform heavy pass of UI optimizations as the variant is resource heavy
to render all". A profile of the winner found the cause:

- 127 animations run inside one 5,000-node SVG;
- a σ 7 bloom is recomputed every frame;
- the camera is a per-frame rewrite of the `transform` attribute.

Together they re-raster the whole scene on every frame. The port keeps the drawing and moves all
of that motion into the compositor:

| Part | How |
|---|---|
| Ground | One static SVG of about a dozen paths, each holding hundreds of traces, vias or skyline rects. It has its own cached layer. |
| Districts | Seven static SVGs, one per district, each in its own cached layer. A tower is about ten nodes: windows of a tier share one path. Hover dimming and the intro rise are opacity and transform on the layer. |
| Beams | One static SVG. The bloom is a filtered `<use>`, rastered once. The breathing is one opacity animation on the layer. |
| Camera | A CSS `transform` transition on two wrappers: the city, and the ground at half the travel (the parallax). The compositor runs it. |
| Small motion | Pulses (8), setup lights and antenna pings each sit in their own small layer. |
| Idle rest | After 15 s with no input, `data-still` pauses every animation (`hooks/useStill`). |
| L2 | The city dims to a static layer (no live blur underneath). |

`will-change: opacity`, not `transform`, promotes the static layers. A transform hint makes Chrome
freeze the raster scale, which would blur the zoomed district.

Measured at 1600x900, L0 idle, against the winner in the same harness (headless Chrome on GPU,
d3d11):

- both hold 60 fps;
- the main thread is busy 6.6% here against 30.3% in the winner (L1: 5.8% against 30.6%; L2: 6.7%
  against 33.9%);
- at rest the main thread drops to 1.6%;
- the page has 2,823 elements against the winner's 5,032.

## Office machines (weak integrated GPUs)

On weak hardware the cost is any motion at all: every animated frame recomposites the scene. So motion runs only
where it can be afforded:

- **Focus.** In a district or a project, the city's ambient motion pauses, and at L2 the city fades out entirely
  (`visibility: hidden`), so nothing behind the project is drawn.
- **Rest.** After 15 s without input everything ambient pauses (`hooks/useStill`).
- **Lite tier.** On a first visit, `hooks/useQuality` times about 1.6 s of frames during the intro. If the median frame
  is over 24 ms, it sets `html[data-door-q="lite"]`, which turns off the intro, ambient motion, grain and bloom, and
  stores the tier. The boot script (`model/fit.ts`) applies a stored tier before first paint. `?quality=full|lite`
  forces one and is remembered. A GPU machine measures full; the software renderer measures lite.
- **Cheap transitions.**
  - Only the open district brightens its windows: one layer re-rasters, not seven.
  - The faded districts and the beams keep their raster through the zoom (`will-change: transform`).
  - Beams switch width instantly rather than animating inside the SVG.
  - The pause rules end on the marked element (`[data-ambient]`), never on a universal selector, so a level
    change restyles a dozen elements instead of the whole tree.
  - The L2 panel mounts a frame after the cutaway.
- **Cheap hover.** One hover update per frame at most (`Scene`), and the answer, labels and chrome are memoised.

Measured on the production build in headless Chrome with software rendering (no GPU, the worst case for a weak
integrated GPU), fps with the worst frame in brackets:

| Phase | Before | Now (auto, lite) | Now, 4x slower CPU |
|---|---|---|---|
| Fleet idle | 19.8 (100 ms) | 60 (17 ms) | 60 (17 ms) |
| Hover sweep | 16.4 (117 ms) | 52 (50 ms) | 51 (33 ms) |
| Open a district | 10.8 (150 ms) | 33 (83 ms) | 33 (100 ms) |
| District idle | 9.6 | 60 | 60 |
| Open a project | 8.5 (150 ms) | 46 (67 ms) | 41 (200 ms) |
| Project idle | 8.2 | 60 | 60 |
| Back to the fleet | 11.3 (667 ms) | 40 (83 ms) | 36 (117 ms) |

Forced to full quality on the same machine, the district and project views also hold 60 fps idle (focus mode). The
fleet view stays at about 20 fps while its ambient motion runs, which is why the lite tier exists.

## Fidelity

`style-contract.py` (contest promotion) shows 0 deviations from the winner across 8 roles: answer
block, big number, its subtitle, answer mark, district label, readout name, brand plate and Enter
button.

Two departures are on purpose, both for rendering cost:

- the city at L2 is dimmed but not blurred;
- the breathing is one layer-wide pulse rather than 50 out-of-phase beams.

## Parts

- `DoorScreen.tsx` composes the page.
- `hooks/useDoor` holds the state machine. `useStageFit`, `useStill` and `useCountUp` are the
  smaller hooks.
- `model/` holds the geometry, ground, words, camera and cutaway. It is pure and tested
  (`door.test.ts`).
- `components/scene/` draws the city layers.
- `components/ui/` holds the answer, labels, readout, parts, tier letters and marks.
- `components/rail/` is L1; `components/l2/` is L2; `components/chrome/` is the corners and the
  loading frame.
