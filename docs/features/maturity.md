# Maturity (`/maturity`)

> How far up each of the nine DevSecOps stages does this project's evidence reach, and which gap is worth closing next?

## What it does
- Draws a "crag" of nine routes, one per stage (plan, create, ... monitor). Bolts are rungs R0-R4; the rope climbs as
  far as there is evidence and turns green at R3 (enforced) or higher. An unknown rung is drawn as `?`.
- The crag has three modes: **Day 0** (the first scan's high point), **Now** (as scanned) and **Target** (the next bolt
  on every route, marked "not earned"). Keys D / N / T.
- Gaps from the scan sit as pickable tags on the next bolt. The toolbar stepper walks **Pick → Preview → Send → After
  merge**: pick gaps, preview their diffs (file tabs), open the **Send as you** sheet with the exact commands, then
  follow each sent gap through merge, run and rescan.
- **Rescan** (R) stamps a new scan time and reads only; it moves no rung on its own.
- The inspector, per selected stage: evidence objects per earned rung (and what the next rung still lacks), the gap
  (diff, then the after-merge checks and timeline), Day 0, and **Credit history**: earlier autopilot cycles on this
  stage plus any credited this session, with a link **Every cycle, every stage ›** to `/cycles`.
- The status bar counts the nine stages: deep, touched (running, configured), absent, and unknown (drawn dashed).

## How it works
- `src/app/maturity/page.tsx` (server) renders `MaturityScreen` with `loadMaturityData()`, which reads
  `getMaturity()` (rungs, rung names, engine, scan time, proposals) and `getStages()` from the DataSource.
- `model/ctx.ts`: `makeCtx(maturity, stages)` joins each shared proposal with this screen's fixtures
  (`data/proposals.ts`, `PROPOSAL_EXTRAS`) and adds stage evidence, credit history and meta into one `MaturityCtx`.
  Proposals without screen data are dropped.
- Pure model (`model/`):
  - `reducer.ts`: `reduce(state, action, ctx)` is the whole screen; `settle` drops the stepper back when a step's
    precondition vanishes. Actions: mode, select, pick, go, move, preview, file, section, send, merge, ran,
    rescanGap, rescanAll.
  - `state.ts`: `initialState`, `pendingIds`, `inFlightIds`. `steps.ts`: `stepsView`, `nextStage`.
  - `rungs.ts`: `Level` (0..4 or null), `rungText` ("?" for unknown), `nextOf`, `levelFor(mode, base, now)`,
    `isDeep`, `countLevels`, `countsText`, `modeLabel`.
  - `flow/credit.ts`: `rescanOutcome` (a change that needs a run earns nothing until it ran), `creditChecks` (same
    engine, not detector-only, exercised, outside the noise band), `timeline`.
  - `flow/commands.ts`: `commandLines` (one commit via `glab api`, then `glab mr create` with `maturity::gap`; a probe
    is `npx belay probe ... --read-only`), `sendLabel`, `addedLines`.
  - `crag/geometry.ts` (`cragGeom`, `ropePath`, `wavyPath`, `clipBox`) and `crag/routes.ts` (`routeViews`, the
    per-route view model).
- Hooks: `useMaturity` (reducer and toasts), `useMaturityKeys` (arrows, P, 1-4, D/N/T, R), `useElementSize`,
  `useUiScale`. Components draw the crag SVG, gaps table, send sheet and inspector with the shared `Stepper`,
  `StageMeter`, `NeedsYouBadge`, `CommandBlock` and `Chip`.

## Rules it keeps
- Unknown is never zero: `Level` is `number | null`, shown as `?`, counted as unknown in the status bar, and kept
  unknown in Day 0 and Target modes.
- Configured is not exercised: merging a job that has not run on main is "no lift"; the rung stays until the
  pipeline ran and a rescan credits it. Credit never crosses engine versions. A probe only reads and never moves a rung.
- A file alone can only earn R1: presence is not behaviour.
- Writes only on a click, as you, with the exact commands shown first in the Send sheet. Picking says "nothing
  written". Gaps are worded as invitations ("worth exploring"), not directives.
- Target mode is labelled "not earned". Merge, pipeline run and the release run are marked "(simulated)".

## Code map
| Path (under src/app/features/maturity/) | Role |
|---|---|
| `MaturityScreen.tsx` | Composes the Window: toolbar, sidebar, crag over gaps table, send sheet, inspector, status |
| `data/loadMaturityData.ts` | Server loader through the DataSource |
| `data/stageEvidence.ts`, `proposals.ts`, `proposalG1.ts`, `proposalG3.ts`, `credit.ts`, `meta.ts`, `types.ts` | Screen fixtures: evidence per rung, proposal diffs, credit history, meta |
| `model/ctx.ts` | Joins shared dataset and fixtures |
| `model/reducer.ts`, `state.ts`, `steps.ts`, `rungs.ts` | Screen state, stepper, rung helpers |
| `model/flow/` | Credit rules and the exact send commands |
| `model/crag/` | Crag geometry and per-route view model |
| `components/crag/` | `Crag`, `Backdrop`, `Route`, `Clip`, `LegendButton` |
| `components/gaps/` | `GapsTable`, `GapRow`, `GapState` |
| `components/sheet/SendSheet.tsx` | Send as you, exact commands first |
| `components/inspector/` | `InspectorPanel`, `EvidenceSection`, `CreditHistory`, `gap/` (`GapSection`, `DiffView`, `AfterMerge`) |
| `components/chrome/`, `components/legend/` | `ScanMeta`, `StageList`, `StatusCounts`; the legend |
| `hooks/` | Reducer + toasts, keys, element size, UI scale |

## Tests
- `model/reducer.test.ts`: initial state, picking, stepper preconditions, send (MRs and probe), credit (policy on
  first rescan, no lift until run, out-of-order steps ignored, tagged release), rescan and modes.
- `model/flow/credit.test.ts`, `model/flow/commands.test.ts`: rescan outcome, the four checks, the timeline; fixture
  completeness, exact commands, probe writes nothing, send label.
- `model/rungs.test.ts`, `model/steps.test.ts`: `?` for unknown, next bolt, modes, counts; stepper view and wrap.
- `model/crag/geometry.test.ts`, `model/crag/routes.test.ts`: crag geometry, clip boxes, route views per mode.
- `render.test.ts`: inspector and crag render in every state; chalk ticks by mode; the send sheet shows commands.
- `src/server/data/__tests__/parity.test.ts`: `loadMaturityData` is the same from the live source as from demo.

## Status and limits
- Rungs, engine, scan time and the gap list come from `getDataSource()` (`src/server/data`); in live mode a scan that
  never ran gives nine null rungs. Evidence objects, proposal diffs, credit history and meta are screen fixtures.
- Send goes through the server actions (`stage-gap-mr`): the sheet shows the server's planned commands per MR gap
  (a whole file's content is folded and shown as the diff), and Send stays disabled until every plan is back. In
  demo mode the server plans and never executes. Merge, pipeline run and rescan are still simulated in the reducer,
  and state is lost on reload. The status line after Send still names the fixture MR ids. Evidence links only toast where they would open.
