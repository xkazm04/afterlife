# Setup (`/setup`)

> What stands between this one project and each armed track, and which of those steps only you can do?

## What it does
- Draws the unlock map for one project (`acme-lab / ledgerline` in the demo): steps 0-14 in four phases on the left,
  the eight tracks in arm order in the middle, and the `belay doctor` capabilities on the right, joined by drawn
  edges.
- Phases: Prepare (0 glab signed in, 1 Belay running and paired, 2 questions answered, 3 licence and access), Connect
  (4 projects created, 5 demo bank pushed, 6 runner and billing, 7 Google Cloud OIDC, 8 secrets), Install (9
  protections, 10 bootstrap MR, 11 enable flows), Prove (12 first scan and gap MR, 13 seeded faults and schedule, 14
  report and hand back).
- Arm order is T4 Guardrail, T3 Governor, T6 Maturity scanners, T1 Patcher, T5 Medic, T2 CRA, T7 Exploratory QA, T8
  Gardener. T1 needs T4+T3+T6; T8 needs T4+T3; T5 needs step 6 (a `gitlab--duo` runner); T2 needs step 12 (the SBOM
  job); T7 needs step 7 (a review-app env).
- The toolbar holds a GitLab group menu (`acme-lab`, probed, and `acme-sandbox`, never probed), the `belay doctor`
  lozenge (available / unavailable / unknown counts; a click lights that status on the map) and Re-probe.
- The inspector shows the default panel (progress, "Only you can do these", unknown capabilities), or the picked step,
  track or capability. The status bar reads
  `3/15 steps probed · 1/8 armed · 5 need you · belay doctor · probed 14:02 · <age>`.

## How it works
- `app/setup/page.tsx` calls `loadSetupData()`, which reads `getSetup()`, `getTracks()` and `getActionClasses()`
  through `getDataSource()` (see `server.md`). The screen is a client component from there on.
- `model/flow/state.ts` `createSetupState` turns the dataset into `SetupState`: steps
  (`todo | human | probing | done`), arms (`locked | ready | open | probing | armed`, with the MR and a `revert` flag), and doctor rows
  (`available | unavailable | unknown`; anything else maps to unknown).
- `model/flow/reducer.ts` `setupReducer` is the only way state changes: `probe-start/end`, `arm-send`,
  `verify-start/end`, `disarm`, `doctor-start/end`, `pick-group`. `recomputeLocks` turns a locked track ready once all
  its needs are met; a merged revert sends the track back to ready and re-locks anything ready that leaned on it.
- Step 6 fails its first probe (`failFirst`: "still 0 runners ... online"); the second passes and frees T5. Finishing
  step 11 settles "Flow created by API" to available; step 12 settles the vulnerability report capability.
- `hooks/useSetupFlow.ts` wraps the reducer with timed simulated probes (900 ms, doctor 1100 ms, capped at 120 ms
  under reduced motion), toasts and status-bar messages. `hooks/useSetupView.ts` holds pick, hover and the lozenge
  filter; hover wins over pick, a pick wins over the filter.
- `model/map/graph.ts` is the dependency closure (`downstream`, `upstream`, `stepFrees`, `stepFreesAll`, `capsOf`)
  over `GRAPH` (needs from `data/armMeta.ts`, reliance from `data/capabilities.ts`). `model/map/hot.ts` `hotSets`
  decides what lights and what dims; `litOf` marks each node.
- `model/map/edges.ts` `buildEdges` makes SVG paths (`curve` step-to-track and track-to-capability, `arc`
  track-to-track) from node boxes measured by `useEdgeGeometry` (`[data-node]` elements). Edges carry `met`, `hot`,
  `wait` (lit and waiting on your gate, drawn amber) and `unknown` (dashed).
- `model/flow/probeAge.ts` runs the demo clock from 14:02 in real minutes and marks a doctor probe stale after 2
  minutes. `model/flow/wording.ts` builds the exact arm/disarm commands and the per-track "why" tooltip.

## Rules it keeps
- A step reaches `done` only through a probe. "Send as you" says what was sent, then probes; Skip and Copy say
  "nothing sent".
- Every write shows its exact command first (`Next write · preview · nothing sent`, `Arm · preview · nothing sent`)
  and goes out only on a click, as `@you`. Arming opens one MR (`glab mr create --source-branch belay/arm-<key> ...`),
  so one revert disarms.
- A person merges: the arm section for an open MR says "Belay never holds a merge token" and waits for "I merged it ·
  verify". Disarm is a revert MR, one click.
- Human gates (steps 3, 6, 7, 8, 10) stay with you. For step 8 you type the model key at the prompt; the probe checks
  only that the masked, protected variable exists.
- Unknown is never rounded up: unknown capabilities are listed with "never rounded up", drawn dashed, and a
  never-probed group shows every row unknown and "never probed" with no age.
- Illustrative content is labelled: commands carry "flags illustrative", capability-to-track edges say "illustrative",
  and the status bar says "illustrative demo data".

## Code map
| Path | Role |
|---|---|
| `src/app/setup/page.tsx` | Route; renders `SetupScreen` with `loadSetupData()` |
| `src/app/features/setup/SetupScreen.tsx` | Composes `Window`: toolbar, map, inspector, status, legend; Esc clears |
| `.../setup/components/map/` | `UnlockMap`, `EdgeLayer` (SVG), `useEdgeGeometry`, `columns/`, `nodes/` |
| `.../setup/components/inspector/` | `DefaultPanel`, `StepPanel`, `TrackPanel` + `TrackArmSection`, `CapPanel`; `parts/` dep rows, probe line |
| `.../setup/components/toolbar/SetupToolbar.tsx` | Group menu, doctor lozenge, Re-probe |
| `.../setup/components/SetupStatus.tsx`, `SetupLegend.tsx` | Progress and probe age; legend behind the `?` |
| `.../setup/components/shared/` | `DepRow`, `GateRow`, `Spinner`, `CapGlyph` (local, not in the kit) |
| `.../setup/hooks/` | `useSetupFlow`, `useSetupView`, `SetupContext`, `useNow` |
| `.../setup/model/flow/` | `state`, `reducer`, `probeAge`, `wording` (pure) |
| `.../setup/model/map/` | `graph`, `hot`, `edges`, `appGraph` (pure) |
| `.../setup/data/` | `stepDetail` (per-step who/does/cmd/probe), `armMeta`, `capabilities`, `timing`, `loadSetupData` |
| `src/server/gitlab/capabilities.ts`, `doctorCli.ts` | The real `belay doctor` (`npm run doctor`, `cli/belay.mjs doctor`) |

## Tests
- `model/flow/reducer.test.ts`: the opening state (3 of 15 probed, T4 armed, T3 and T6 ready), step 6 failing then
  passing and freeing T5, steps 11/12 settling doctor rows, arm -> merge -> verify, disarm re-locking dependants,
  group switching and Re-probe.
- `model/flow/probeAge.test.ts` (clock, age format, stale after two minutes, never-probed), `wording.test.ts` (exact
  arm/disarm commands, why text).
- `model/map/graph.test.ts` (closure, cycle termination, the Belay arm graph, `hotSets`, `litOf`) and `edges.test.ts`
  (curves, met/unknown/wait, unmeasured nodes skipped).
- `SetupScreen.test.ts`: server render with demo data; 15 steps, 8 tracks, 9 capabilities as nodes; progress text;
  "never rounded up" and "illustrative demo data" present.

## Status and limits
- Every write on this screen is simulated: a click moves local state and shows a toast; nothing leaves the page. "Open
  in GitLab" and "Open !N" toast "Would open ...".
- In live mode only the group and project names come from the index (the pairing row); phases, step states and doctor
  rows are still the demo catalogue.
- The screen's nine doctor rows are a fixed demo list. The real `belay doctor` (`src/server/gitlab/capabilities.ts`)
  probes eleven capabilities with GETs only and gives each a basis and reason; the two lists are not wired together
  yet.
- Commands in `stepDetail.ts` are illustrative (glab flags recalled, not sourced). Capability reliance (`CAP_USES`) is
  not in the dataset.
- `acme-sandbox` capability results are hard-coded per row. No arrow-key walk; Tab walks the nodes. Cmd/Ctrl+I toggles
  the inspector.
