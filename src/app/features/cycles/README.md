# Cycles (`/cycles`)

Improvement as a loop that does not end. Each **cycle** is one round on a project: **Scan → Pick → Send → Merge →
Prove → Credit**. It closes only when a same-engine rescan has credited, rejected or found no lift for every change it
sent, and anything it did not earn is carried into a later cycle. One cycle runs at a time, so every credit is
measured against a settled scan. All data is illustrative demo data.

## What the screen answers
- **How far have the rounds taken us?** The answer band: rungs held (of 36), gained since day 0, credited / not
  earned / drift caught.
- **Can I believe that number?** Two proofs, re-derived on every render: the replayed history equals the latest
  scan (`replay = 14:02 scan`), and the chain holds (every change starts at the rung the replay holds for its stage).
- **What did each round do?** The stage x cycle grid (lifts glow, drift is drawn in the second voice, a ring marks a
  try that did not earn), the trajectory above it, and the selected cycle's rail and changes.
- **What is next?** The running cycle is what Maturity has picked; the planned one is what it has not, plus carried
  misses (C8 retries !21 from C5 as the g4 probe).

## Parts
- `CyclesScreen.tsx` composes the `Window`: sidebar `CyclesSidebar`, content (`Answer`, `CycleGrid`, `LoopRail`,
  `ChangesTable`), `CyclesInspector` (numbers, when, `ClosingRule`, next action), `CyclesStatus`, `CyclesLegend`.
- `hooks/useCycles` the selection (the running cycle first) and the arrow / Home / End walk.
- `data/history.ts` the closed cycles C1-C6; `data/loadCyclesData.ts` joins them to `getMaturity()` on the server.

## Model (pure, tested)
- `model/replay.ts` `applyCycle`, `replay`, `chainBreaks`, `reconcile`, `heatGrid`, `summarize`. Only `credited`,
  `resolved` and `regressed` move a rung; `nolift` and `rejected` never do; open cycles move nothing.
- `model/plan.ts` `openCycles` (running from picked gaps, planned from the rest plus `carried` misses), `rail`.
- `model/grid.ts` the grid view (columns, ghost targets, projected totals). `model/words.ts` phase and verdict words.
- `model/build.ts` `buildCycles`: the screen data, with `drift` (stages off the scan) and `breaks` (chain breaks).

`model/cycles.test.ts` holds the demo history to account: it replays to the 14:02 scan exactly, the chain holds, and
every Maturity credit-history entry (!17 to !23) is a change with the same verdict.

## Not wired
The history is a screen fixture (like Maturity's credit history); live mode reads the same fixture. Sending, merging
and rescanning happen in Maturity.
