# Cycles (`/cycles`)

> What has each round of improvement earned, does the history add up to the latest scan, and what runs next?

## What it does
- Shows a project's improvement as a loop of **cycles**. Each cycle walks six phases: **Scan → Pick → Send → Merge →
  Prove → Credit**. It closes only when a same-engine rescan has credited, rejected or found no lift for every change
  it sent. One cycle runs at a time, so every credit is measured against a settled scan.
- Draws a **stage × cycle grid**: every stage's rung (R0–R4) from day 0, through each closed cycle, to the running and
  the planned one. Lifts glow, drift (a rung that fell) is drawn in the pink second voice, and a ring marks a change
  that was tried and not earned. Open cycles show their targets as dashed ghosts. A trajectory band above the grid
  plots rungs held per column, dashed for what the open cycles would add.
- States its own proofs in the answer band: **replay = scan** (day 0 plus every closed cycle's verdicts equals the
  latest scan) and **chain holds** (every change starts at the rung the replay holds for its stage).
- **Design the next cycle** in the app (toolbar or the planned cycle's inspector, or `/cycles?design=1`). The grid
  previews the design live, and the rules are checked as you pick.
- **Report a closed cycle**: the hand-back as Markdown, exactly as it would be posted, with the `glab issue create`
  command that posts it as you. Nothing is posted from the app.

## How it works
`app/cycles/page.tsx` → `data/loadCyclesData.ts` joins `getMaturity()` (the scan, the gap proposals) with
`getCycles()` (the closed history) → `model/build.ts` `buildCycles()` → `CyclesScreen` (client).

- **Where the history comes from.** Each closed cycle is one line of `belay-ledger/cycles/<project-id>.jsonl`
  (`src/schemas/cycle.ts`): theme, engine, the opening and closing rescans as instants, and every change with its
  verdict. Lines are hash-chained like the event ledger. The poller imports the file into `cycle_record`; it must
  verify from the first cycle and may only extend what is stored (an edited, shortened or rewritten history is
  rejected and the feed fails). The view counts days from the first cycle's opening. Demo mode reads the same six
  cycles from `src/lib/demo/cycles.ts`; the fake GitLab serves them as the file, so live mode reads them from the
  ledger and lands on the same screen.

- `model/replay.ts`: `applyCycle`, `replay`, `chainBreaks`, `reconcile`, `heatGrid`, `summarize`, `reach`, `total`.
  Only `credited`, `resolved` and `regressed` move a rung. `nolift` and `rejected` never do, and open cycles move
  nothing.
- `model/plan.ts`: `openCycles` derives the running cycle from Maturity's picked gaps and the planned one from the rest.
  `carried` adds anything a closed cycle tried and did not earn, keeping one per stage and target, rebased to where the
  stage stands now. `rail` places a cycle on the six phases. `stageTheme` names a cycle.
- `model/design.ts`: `candidates` lists the planned proposals and carried retries first, then each uncovered stage's
  next rung, or a probe when the rung is unknown. `checkDesign` enforces the rules. `designSummary` sums the MRs,
  probes, lines and rungs in reach. `applyDesign` makes a saved design the planned cycle.
- `model/grid.ts` builds the grid view (columns, ghost targets, projected totals). `model/words.ts` holds phase and
  verdict words. `model/report/report.ts` builds the Markdown hand-back and the post command.
- `hooks/useCycles.ts`: selection (the running cycle first; ← → Home End walk), the design draft and the saved design.

## Rules it keeps
- **A closed cycle never ticks a check its own changes failed.** No lift fails "Exercised" and rejected fails "Not
  detector-only". A failed check is ✗ and says how many changes it stopped.
- **Credit never crosses engine versions**: a cycle has exactly one engine.
- **Unknown is never zero**: an unknown rung is a dashed "?", and a probe on an unknown adds the rung it finds, never
  more. A probe on a known rung adds nothing in reach.
- **Design rules** (a design that breaks one cannot be saved): one change per stage, so a rescan can say which change
  earned the rung; at most four changes (`WIP_CAP`); nothing on a stage the running cycle is lifting; an unknown rung
  is probed before anything lifts it.
- Only phases that wait for a person (Pick, Send, Merge) turn amber; amber means "waits for you" everywhere in the app.

## Code map
| Path (under `src/app/features/cycles/`) | Role |
|---|---|
| `CyclesScreen.tsx` | The window: answer band, grid card, detail or designer, inspector, report sheet |
| `components/answer/` | The big number, credited / not earned / drift, the two proofs |
| `components/grid/` | `CycleGrid` (roving-tabindex column heads), `Trajectory` |
| `components/rail/` | `LoopRail`: the six phases of the selected cycle |
| `components/changes/` | `ChangesTable`: each change, its move, verdict and why |
| `components/inspector/` | `CyclesInspector`, `ClosingRule` (✓ / ✗ per check, misses and drift named) |
| `components/designer/` | `Designer`: candidates, rules, summary, save |
| `components/report/` | `ReportSheet`: the Markdown, copy, the post command |
| `src/lib/demo/cycles.ts` | Demo history C1–C6 (illustrative, written to reconcile with the demo scan); domain types in `src/lib/demo/cycleTypes.ts` |
| `src/server/ledger/importCycles.ts`, `parseCycles.ts` | The cycle file: parse, verify, import |
| `src/server/index/views/cycles.ts` | `cycle_record` → the screen's history |
| `model/` | The pure model above |

## Tests
- `model/cycles.test.ts`: the demo history replays exactly to the 14:02 scan, the chain holds, every Maturity
  credit-history entry (!17–!23) is a change with the same verdict, carry and rebase, probe reach.
- `model/design.test.ts`: candidates, blocked stages, every design rule, summary, applying a design, theme naming.
- `model/report/report.test.ts`: rungs held after that cycle (not today), sections, both proofs stated (and a broken
  replay reported), the post command.
- `render.test.ts`: every part renders for every cycle; a closed cycle never shows a ✗ it did not earn; the
  trajectory survives an all-zero history.
- `src/server/data/__tests__/parity.test.ts`: the loader gives the same data in demo and live mode.

## Status and limits
- The closed history is read from the project's ledger in live mode (the demo's is illustrative). Nothing in the app
  writes a cycle record yet: the closing rescan is meant to append it (the autopilot, or `belay scan` in CI). A
  project with no cycle file shows C1 running from day 0, and every stage the scan moved since day 0 as drift.
  Sending, merging and rescanning happen in Maturity.
- A saved design is kept for the browser session only, and the screen says so.
- One project (the deep project, ledgerline) has a cycle history in the demo.
