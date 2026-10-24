# Setup (`/setup`, `/setup/[node]`)

> What stands between this one project and each armed track, and which of those steps only you can do?

The feature's own README (`src/app/features/setup/README.md`) holds the decisions and the step-by-step disagreements
with `skills/adopt-belay`; this page is the overview.

## What it does
- Draws the unlock map for one project (`acme-lab / ledgerline` in the demo, the paired group and target in live
  mode): steps 0-14 in four phases on the left, the eight tracks in arm order in the middle, and the `belay doctor`
  capabilities on the right, joined by drawn edges. A strip above the map counts where you stand and lists the gates
  only you can open.
- Phases: Prepare (0 glab signed in, 1 Belay running and paired, 2 questions answered, 3 licence and access), Connect
  (4 projects created, 5 demo bank pushed, 6 runner and billing, 7 Google Cloud OIDC, 8 secrets), Install (9
  protections, 10 bootstrap MR, 11 enable flows), Prove (12 first scan and gap MR, 13 seeded faults and schedule, 14
  report and hand back).
- Arm order is T4 Guardrail, T3 Governor, T6 Maturity scanners, T1 Patcher, T5 Medic, T2 CRA, T7 Exploratory QA, T8
  Gardener. T4, T3 and T6 need step 4 (their MRs include belay-pack components); T1 needs T4+T3+T6; T8 needs T4+T3;
  T5 needs step 6 (a `gitlab--duo` runner); T2 needs step 12 (the SBOM job); T7 needs step 7 (a review-app env).
  Setup arms T4, T3, T6 and T1; the other four read "not defined yet" in live mode.
- The toolbar holds a GitLab group menu (demo: `acme-lab`, probed, and `acme-sandbox`, never probed; live: the paired
  group only), the `belay doctor` lozenge (available / unavailable / unknown counts; a click lights that status on the
  map) and Re-probe.
- A click (or Enter) on a node opens its page, `/setup/step-<n>`, `/setup/track-<id>` or `/setup/cap-<slug>`: a step's
  commands (Copy only), a track's arm or disarm MR as the server planned it and its enrollment, a capability's probe.
  The status bar reads `<n>/15 steps read done · <n>/8 armed · <n> need you · belay doctor · probed 14:02 · <age>`.

## How it works
- `src/app/(app)/setup/layout.tsx` awaits `loadSetupData()` and holds the flow in `SetupProvider`, so a probe or an arm on
  a node's page survives the trip back to the map. `loadSetupData` reads `getSetup()`, `getTracks()`,
  `getActionClasses()` and `getPolicy()` through `getDataSource()` (see `server.md`); in live mode it also awaits
  `readLiveSetup` (`src/server/data/setup/read.ts`): each track's arm block on the target's main, the belay doctor and
  the steps a read can observe. `src/app/(app)/setup/[node]/page.tsx` resolves the segment with `loadSetupNode` (404 for
  any other).
- `model/flow/state.ts` `createSetupState` turns that into `SetupState`: steps (`todo | human | probing | done` in the
  demo, `done | failed | unknown` as a live read saw them), tracks (`locked | ready | open | probing | armed`, plus
  `undefined` and `unknown` in live mode) and doctor rows (`available | unavailable | unknown`).
- `model/flow/reducer.ts` `setupReducer` is the only way state changes: `probe-start/end`, `arm-sent`,
  `verify-start/end`, `doctor-start/end`, `doctor-read`, `steps-read`, `say-done`, `unsay`, `pick-group`.
  `recomputeLocks` turns a locked track ready once its needs are met and locks a ready one whose need a read takes
  back; a merged revert sends the track back to ready and re-locks anything that leaned on it.
- Demo: `hooks/useSetupFlow.ts` simulates the probes on timers (900 ms, doctor 1100 ms, capped at 120 ms under reduced
  motion). Step 6 fails its first probe (`failFirst`); finishing step 11 or 12 settles a doctor row. Live:
  `hooks/liveFlow.ts` answers a step's verify and Re-probe with `rereadSetupAction` (`read/reread.ts`), read only.
- Arm and disarm (`write/arm.ts`, `hooks/useArmWrite.ts`, `hooks/armFlow.ts`) go through the server's
  `previewAction` and `confirmAction` by preview id; "I merged it · verify" calls `verifyArmAction`, a read of the
  default branch (`model/flow/verify.ts`). Enrollment (`write/enroll.ts`, `hooks/useEnrollWrite.ts`, `model/enroll/`)
  follows the arm the same way.
- `hooks/useSetupView.ts` holds the hover and the lozenge filter (a hover wins); a pick navigates to the node's page.
- `model/map/graph.ts` is the dependency closure (`downstream`, `upstream`, `stepFrees`, `stepFreesAll`, `capsOf`)
  over `GRAPH` (needs from `data/armMeta.ts`, reliance from `data/capabilities.ts`). `model/map/hot.ts` `hotSets`
  decides what lights and what dims; `litOf` marks each node.
- `model/map/edges.ts` `buildEdges` makes SVG paths (`curve` step-to-track and track-to-capability, `arc`
  track-to-track) from node boxes measured by `useEdgeGeometry` (`[data-node]` elements). Edges carry `met`, `hot`,
  `wait` (lit and waiting on your gate, drawn amber) and `unknown` (dashed).
- `model/flow/probeAge.ts` runs the demo clock from 14:02 in real minutes and marks a doctor probe stale after 2
  minutes, or failed. `model/flow/wording.ts` names MRs only as GitLab named them and words each track's and step's
  tooltip. The commands are the server's (arm, enroll) or `data/stepDetail.ts`'s (steps); the screen spells none.

## Rules it keeps
- A step reaches `done` only through a probe (demo) or a read (live). In live mode a step's write is never sent from
  the screen: Copy only.
- Every MR shows its exact plan first and goes out only on a click, confirmed by that preview's id; the MR number and
  address come from the confirm's answer. One MR arms a track, so one revert disarms it.
- A person merges: the arm section says "Belay never holds a merge token" and waits for "I merged it · verify". A
  track arms only when the read of main saw its block there.
- Human gates (steps 3, 6, 7, 8, 10) stay with you. Step 8 sets the four `BELAY_*` tokens on belay-apply, one command
  each, the value read silently from the prompt; Belay never reads them and asks for no model key. A step no read can
  see done (7, 8) offers "I did it · say so": it stops counting as yours, stays unknown, and is kept only until reload.
- Unknown is never rounded up: unknown capabilities are listed, drawn dashed, and a never-probed group shows every
  row unknown and "never probed" with no age. A failed probe reads "probe failed HH:MM", never as a fresh one.
- What is still the demo catalogue's in live mode (step titles and phases, track names) is chipped "demo";
  capability-to-track reliance is the demo's alone and is not drawn in live mode.

## Code map
| Path | Role |
|---|---|
| `src/app/(app)/setup/layout.tsx`, `page.tsx`, `[node]/page.tsx` | Routes; the layout loads the data and holds `SetupProvider` |
| `src/app/features/setup/SetupScreen.tsx` | Composes `Window`: toolbar, summary strip, map, status, legend |
| `src/app/features/setup/SetupNodeScreen.tsx` | One node as a `DetailPage` (`nodeHead`, `NodeBody`) |
| `.../setup/components/map/` | `UnlockMap`, `EdgeLayer` (SVG), `useEdgeGeometry`, `columns/`, `nodes/` |
| `.../setup/components/inspector/` | `StepPanel`, `TrackPanel` + `TrackArmSection` + `EnrollSection`, `CapPanel`; `parts/` dep rows, probe line, arm preview |
| `.../setup/components/summary/`, `toolbar/` | Summary strip; group menu, doctor lozenge, Re-probe |
| `.../setup/components/SetupStatus.tsx`, `SetupLegend.tsx` | Progress and probe age; legend behind the `?` |
| `.../setup/components/shared/` | `DepRow`, `GateRow`, `Spinner`, `CapGlyph` (local, not in the kit) |
| `.../setup/hooks/` | `SetupProvider`, `SetupContext`, `useSetupFlow`, `liveFlow`, `armFlow`, `useArmWrite`, `useEnrollWrite`, `useSetupView` |
| `.../setup/model/` | `flow/` (state, reducer, probeAge, verify, wording), `map/` (graph, hot, edges, appGraph), `live/`, `enroll/`, `clipboard/`, `nodeKey` (pure) |
| `.../setup/data/` | `stepDetail`, `armMeta`, `capabilities`, `timing`, `live/liveCapabilities`, `loadSetupData`, `loadSetupNode` |
| `.../setup/read/`, `write/` | `rereadSetupAction`; the arm, verify and enroll round trips |
| `src/server/data/setup/` | The live reads: arm blocks, doctor, observable steps, step 9's protections |
| `src/server/gitlab/capabilities.ts`, `doctorCli.ts` | The real `belay doctor` (`npm run doctor`, `cli/belay.mjs doctor`) |

## Tests
- `model/flow/reducer.test.ts`: the opening state, step 6 failing then passing and freeing T5, steps 11/12 settling
  doctor rows, arm -> merge -> verify, disarm re-locking dependants, a read taking a step back, group switching and
  Re-probe. `verify.test.ts`, `probeAge.test.ts`, `wording.test.ts`, `model/live/live.test.ts` (live opening states).
- `model/map/graph.test.ts` (closure, the Belay arm graph, `hotSets`, `litOf`) and `edges.test.ts`.
- `data/tables.test.ts` holds the hand-kept tables to the demo catalogue; `stepDetail.test.ts` holds the step commands
  to `skills/adopt-belay` and to the paired host; `liveCapabilities.test.ts` holds the live labels to the doctor's.
- `hooks/armFlow.test.ts`, `liveFlow.test.ts`; `write/arm.test.ts`, `enroll.test.ts`; the inspector panels' render
  tests under `components/inspector/`.
- `SetupScreen.test.ts`: server render with demo and live data; 15 steps, 8 tracks, 9 capabilities as nodes; the
  summary strip and progress text; what is still the demo's is marked.

## Status and limits
- Demo mode simulates the steps, the doctor and every MR (said "Simulated" on screen); "Open in GitLab" toasts where it
  would open. Live mode opens real arm, disarm and enrollment MRs as you, after the preview.
- Live mode reads steps 0, 1, 3, 4, 6, 8 (never done), 9 and 10; 7 is said, not read; 2, 5 and 11-14 read unknown.
- "You said done" is screen state only: a reload counts the step as yours again.
- No arrow-key walk; Tab walks the nodes, Esc clears the hover and the filter.
