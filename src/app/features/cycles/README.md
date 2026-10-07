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

## Designing the next cycle
**Design C8** (toolbar, or the planned cycle's inspector) opens the designer under the grid. Candidates are the
planned proposals (and carried retries), then each uncovered stage's next rung (or a probe, when it is unknown). The
grid previews the design live. The rules are checked as you pick, and a design that breaks one cannot be saved:
- **one change per stage**, so a rescan can say which change earned the rung;
- **at most four changes** (`WIP_CAP`), so a red rescan still says which change failed;
- **nothing on a stage the running cycle is lifting**: nobody plans on a rung that is still moving;
- an unknown rung gets a **probe** first, never a lift. The engine is pinned for the whole cycle.
A saved design becomes the planned cycle for this browser session (demo).

## Reporting a cycle
A closed cycle's inspector has **Report**: the hand-back as Markdown (`model/report/report.ts`, tested), exactly as it
would be posted: net rungs and the rungs held after it, every change with its verdict and why, the misses carried
forward, the drift caught, both proofs as they stand, and what runs next. Copy it, or post it as an issue, as you,
with the `glab issue create` command the sheet shows. Nothing is posted from the app.

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
- `model/design.ts` `candidates`, `checkDesign`, `designSummary`, `applyDesign` (the designer, tested in `design.test.ts`).
- `model/build.ts` `buildCycles`: the screen data, with `drift` (stages off the scan) and `breaks` (chain breaks).

`model/cycles.test.ts` holds the demo history to account: it replays to the 14:02 scan exactly, the chain holds, and
every Maturity credit-history entry (!17 to !23) is a change with the same verdict.

## Not wired
The history is a screen fixture (like Maturity's credit history); live mode reads the same fixture. Sending, merging
and rescanning happen in Maturity.
