# Maturity (`/maturity`)

> How far up each of the nine DevSecOps stages does this project's evidence reach, and which gap is worth closing next?

## What it does
- Draws a "crag" of nine routes, one per stage (plan, create, ... govern). Bolts are rungs R0-R4; the rope climbs as
  far as there is evidence and turns green at R3 (enforced) or higher. An unknown rung is drawn as `?`.
- The crag has three modes: **Day 0** (the first scan's high point), **Now** (as scanned) and **Target** (the next bolt
  on every route, marked "not earned"). Keys D / N / T.
- Gaps from the scan sit as pickable tags on the next bolt and as rows of the gaps table under the crag (one row per
  proposal, with its tier, state and next move). The toolbar stepper walks **Pick → Preview → Send → After merge**:
  pick gaps, preview their diffs on their stage pages, open the **Send as you** sheet with the server's exact commands,
  then follow each sent gap through merge, run and rescan.
- **Rescan** (R) decides every merged gap at once (credit or no lift), one notice for all; with nothing merged it only
  reads. Simulated, and marked so.
- Each stage has its own page, `/maturity/[stage]`: evidence objects per earned rung (and what the next rung still
  lacks), the gap (diff, then the after-merge checks and timeline), Day 0, and **Credit history**: earlier autopilot
  cycles on this stage plus any credited this session, with a link **Every cycle, every stage ›** to `/cycles`.
- The status bar counts the nine stages: deep, touched (running, configured), absent, and unknown (drawn dashed).

## How it works
- `src/app/(app)/maturity/layout.tsx` (server) loads `loadMaturityData()` (`getMaturity()`: rungs, rung names, engine, scan
  time, proposals; and `getStages()`) plus the project and data mode, and mounts `MaturityProvider`, which holds the one
  `useMaturity` session for the list (`page.tsx` → `MaturityScreen`) and every stage page (`[stage]/page.tsx` →
  `StageScreen`, `loadMaturityStage` or not found).
- `model/ctx.ts`: `makeCtx(maturity, stages, { mode })` joins each shared proposal with this screen's fixtures
  (`data/proposals.ts`, `PROPOSAL_EXTRAS`) and adds stage evidence, credit history and meta into one `MaturityCtx`;
  in live mode it leaves out the fixtures that would pass for the project's own. Proposals without screen data are dropped.
- Pure model (`model/`):
  - `reducer.ts`: `reduce(state, action, ctx)` is the whole screen; `settle` drops the stepper back when a step's
    precondition vanishes. Actions: mode, select, togglePick, go, move, preview, file, section, cancelSheet, sent, the
    moves (merge, ran, rescanGap), rescanAll, and the send's (ask, viewed, retry, sending, answered).
  - `state.ts`: `initialState`, `pendingIds`, `inFlightIds`, `sentName`, `statusLine`. `steps.ts`: `stepsView`,
    `nextStage`, `stepTarget`.
  - `rungs.ts`: `Level` (0..4 or null), `TOP_RUNG`, `rungText` ("?" for unknown), `rungLabel`, `moveText`, `nextOf`,
    `levelFor(mode, base, now)`, `isDeep`, `countLevels`, `countsText`, `modeLabel`.
  - `flow/credit.ts`: `rescanOutcome` (a change that needs a run earns nothing until it ran), `creditChecks` (same
    engine and not detector-only read "not checked"; exercised; outside the noise band), `timeline`, `ranWhere`.
  - `flow/send.ts` a gap's send, held by the reducer; `flow/moves.ts` a sent gap's next move and the rescans;
    `flow/lede.ts` the line a stage page opens with; `flow/commands.ts` the sheet's `sendLabel` / `sentLabel` (the
    commands themselves are the server's preview).
  - `crag/geometry.ts` (`cragGeom`, `ropePath`, `wavyPath`, `clipBox`) and `crag/routes.ts` (`routeViews`, the
    per-route view model). `keys/keymap.ts` the screen's keys.
- `write/gap.ts` builds the `stage-gap-mr` intent and asks (`previewAction`) / sends (`confirmAction`); `write/sheet.ts`
  is what the Send sheet does with those.
- Hooks: `useMaturity` (reducer and toasts), `useMaturityKeys`, `useGapSheet`, `useStepNav`, `useElementSize`,
  `useUiScale`. Components draw the crag SVG, gaps table, send sheet and stage cards with the shared `Stepper`,
  `StageMeter`, `NeedsYouBadge`, `CommandBlock` and `Chip`.

## Rules it keeps
- Unknown is never zero: `Level` is `number | null`, shown as `?`, counted as unknown in the status bar, and kept
  unknown in Day 0 and Target modes.
- Configured is not exercised: merging a job that has not run on main is "no lift"; the rung stays until the
  pipeline ran and a rescan credits it. Credit never crosses engine versions. A probe only reads and never moves a rung.
- A file alone can only earn R1: presence is not behaviour.
- Writes only on a click, as you, with the server's exact commands shown first in the Send sheet. Picking says "nothing
  written". Gaps are worded as invitations ("worth exploring"), not directives.
- Target mode is labelled "not earned". Merge, pipeline run, the release run and every rescan are marked "simulated".

## Code map
| Path (under src/app/features/maturity/) | Role |
|---|---|
| `MaturityProvider.tsx` | The one session, held by the `/maturity` layout |
| `MaturityScreen.tsx` | Composes the Window: toolbar, sidebar, crag over gaps table, send sheet, status |
| `StageScreen.tsx` | `/maturity/[stage]`: a `DetailPage` of `StageDetail`, the legend and the preview picker |
| `data/loadMaturityData.ts`, `data/loadMaturityStage.ts` | Server loaders through the DataSource |
| `data/stageEvidence.ts`, `proposals.ts`, `proposalG1.ts`, `proposalG3.ts`, `credit.ts`, `meta.ts`, `types.ts` | Screen fixtures: evidence per rung, proposal diffs, credit history, meta |
| `model/ctx.ts` | Joins shared dataset and fixtures |
| `model/reducer.ts`, `state.ts`, `steps.ts`, `rungs.ts` | Screen state, stepper, rung helpers |
| `model/flow/` | Credit rules, the send, the after-merge moves, the stage lede, the sheet labels |
| `model/crag/`, `model/keys/` | Crag geometry and per-route view model; the keymap |
| `write/` | The gap door (`gap.ts`) and the Send sheet's calls (`sheet.ts`) |
| `components/crag/` | `Crag`, `Backdrop`, `Route`, `Clip`, `LegendButton` |
| `components/gaps/` | `GapsTable`, `GapRow`, `GapState` |
| `components/sheet/SendSheet.tsx` | Send as you, the server's exact commands first |
| `components/inspector/` | `StageDetail`'s cards: `EvidenceSection`, `CreditHistory`, `gap/` (`GapSection`, `DiffView`, `AfterMerge`) |
| `components/chrome/`, `components/legend/` | `ScanMeta`, `StageList`, `StatusCounts`, `DemoChip`; the legend |
| `hooks/` | Reducer + toasts, keys, the sheet's calls, step navigation, element size, UI scale |

## Tests
- `model/reducer.test.ts`: initial state, picking, stepper preconditions, send, credit (policy on first rescan, no lift
  until run, out-of-order steps ignored, tagged release), rescan and modes. `model/flow/*.test.ts`: credit rules, the
  send's slots, the moves, the lede, the sheet labels and fixture diff sizes.
- `model/rungs.test.ts`, `model/steps.test.ts`, `model/crag/*.test.ts`, `model/fixtures.test.ts`: rung helpers, stepper
  view and landing, crag geometry and route views, fixtures pinned to their sources.
- `write/*.test.ts`, `hooks/useGapSheet.test.ts`, `components/sheet/SendSheet.test.tsx`: the gap door, the sheet's asks
  and sends with the actions mocked.
- `render.test.ts`, `labels.test.tsx` (both modes), the `components/**` tests, `readme.test.ts` (the README names every
  hook, flow file, keymap and loader).
- `src/server/data/__tests__/parity.test.ts`: `loadMaturityData` is the same from the live source as from demo.

## Status and limits
- Rungs, engine, scan time and the gap list come from `getDataSource()` (`src/server/data`); in live mode a scan that
  never ran gives nine null rungs. Evidence objects, proposal diffs, credit history and meta are screen fixtures.
- Send goes through the server actions (`stage-gap-mr`): the sheet shows the server's planned commands and diff per MR
  gap, and the button confirms each preview on screen by its id. In demo mode the server plans and never executes; in
  live mode a gap whose files are the demo fixture is never sent. Merge, pipeline run and rescan are still simulated in
  the reducer, and state is lost on reload. A sent gap is named by the MR GitLab named, else "gap g2". Evidence links
  only toast where they would open.
