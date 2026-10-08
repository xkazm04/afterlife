# Needs you (`/needs-you`)

> What decisions are waiting for me, and what exactly will each button write?

## What it does
- Lists every decision that waits for a person, and nothing else: the CRA sign-off (`n2`), a promotion (`n1`), a
  re-admission (`n4`), four maturity gaps to pick (`g1`-`g4`, one row each) and a setup step (`n5`). Rows can be
  grouped By kind, By project or By deadline; "Decided this week" is always the last group.
- The **CRA legal clock band** sits above the table and is the loudest thing on the screen: a live countdown, a 24 h
  rail from "aware 09:10" to "due 09:10" with +6/+12/+18 h ticks, the packet grade ladder (draft, reviewable, ready to
  sign, with "attested" struck out), the six evidence links, and the buttons. It is labelled "drill · seeded".
- The CRA flow: **Read the draft** opens the inspector on the draft; **Ready to sign** is disabled until it is read;
  it then stages the write; after Run the band shows "Ready to sign · you submit on ENISA" and **I submitted it**
  records the submission note.
- Each row has one action (Read draft, Ready to sign, Promote, Re-admit, Read note, Stage, Take back, Open runner page,
  Check again, Simulate merge, Show again). Space ticks an unstaged gap or runs the row's action. Right-click offers
  Show in Inspector, the row's action, Not yet (promotion), Retire (re-admission), Pick/Untick (gap) and Copy Command.
- The **outbox** drawer holds staged writes. Each item shows its kind, title, write ref, the exact commands and (for
  policy MRs) the diff of `belay-policy/tier-state.yml`, with **Run** and **Remove**. Below it, "Sent this session".
- The inspector has one view per selection (CRA, promote, re-admit, gap, runner, history row, group); "The click"
  lists what a button does and what it will not do.
- The sidebar filters All / Waiting / Outbox / Sent; the toolbar has the grouping and search.

## How it works
- `src/app/needs-you/page.tsx` (server) calls `loadNeedsYou()` from `data/pick.ts`. It renders `NeedsYouScreen` with
  the slice, or `NeedsYouEmpty` when the source lacks the items the screen is built around.
- `data/pick.ts`: `pickNeedsYouDemo()` reads the DataSource for needs-you items `n1`, `n2`, `n4`, `n5`, the maturity
  proposals and rung names, the `!44` incident task, the `patch-bump` class record and the tier meanings, and throws
  `MissingNeedsYouData` if any is missing; `loadNeedsYou()` turns that into `null`.
- `data/*.ts` hold the screen's own fixtures: `cra.ts` (deadline, draft, evidence, grades, commands), `promote.ts`,
  `readmit.ts`, `gaps.ts`, `runner.ts`, `week.ts` (the ledger's earlier decisions), `constants.ts` (operator,
  repos, demo time).
- Pure model (`model/`):
  - `reducer.ts`: `reduce(state, action, demo)` is the only state change. `act.ts` maps every `ActionId` to a
    transition; `run.ts` (`runItem`) is the only send; `state.ts` has `initialState`, `notify`, `revealSection`.
  - `outbox/outbox.ts`: `stageItem` (replace by key, keep the clock item first), `unstageItem`, `buildOutItem`.
    `outbox/commands.ts`: `gapCommand` (draft MR on the gap branch, or an issue for a probe), `commandsFor`.
  - `clock/clock.ts`: `secondsLeft`, `clockParts`, `clockText`, `elapsedPercent`, `railTicks`.
    `clock/grades.ts`: `gradeIndex`, `gradeState`, `nextGrade`.
  - `rows/`: `rowState` (state column, waiting / in outbox / decided), `rowAction` / `spaceAction`, `grouping`
    (`groupsFor`, `isVisible`, `visibleGroups`, `navItems`), `rowData` (cells), `history` ("Decided this week").
  - `menu.ts`: right-click entries as data.
- Hooks: `useNeedsYou` (the reducer; each notice shown once as toast or status), `useElapsed` (seconds since mount,
  0 on server and first render), `useNeedsKeys`, `useNeedsMenus`.

## Rules it keeps
- Writes only on Run. Staging sends nothing; Run is the only send, and its toast always says "ran as @operator". The
  exact command (and diff) is shown in the outbox before anything runs. Remove or Take back says "Nothing was sent".
- Retire, Not yet and the runner check skip the outbox. Retire ("Retire (runs now)") is one commit to
  belay-policy as you, since restricting is free; Not yet and the runner check write nothing.
- Read before act: Ready to sign needs the draft read; Re-admit needs the incident note read. Opening those inspector
  sections counts as reading.
- The legal clock never pauses and never goes below zero; it is first in line in the outbox. Marking ready to sign
  does not stop it, and the screen never submits: "report.submit is Human only", a person submits on ENISA's platform.
- "attested" is never reachable on the grade ladder; the grade moves up by one at most.
- Seeded and simulated data is labelled: the CRA band reads "drill · seeded", the vulnerability is "seeded", the
  promotion merge is "Simulate merge" and its toast says "(simulated)".
- An empty live inbox is not drawn as "nothing waits": `NeedsYouEmpty` says what is missing.

## Code map
| Path (under src/app/features/needs-you/) | Role |
|---|---|
| `NeedsYouScreen.tsx` | Composes the Window: band, table, outbox drawer, inspector, status line |
| `NeedsYouEmpty.tsx` | Server component shown when the source lacks the inbox items |
| `data/pick.ts` | Server slice of the DataSource (`pickNeedsYouDemo`, `loadNeedsYou`) |
| `data/cra.ts`, `promote.ts`, `readmit.ts`, `gaps.ts`, `runner.ts`, `week.ts`, `constants.ts` | Screen fixtures and copy |
| `model/reducer.ts`, `act.ts`, `run.ts`, `state.ts`, `types.ts` | State, actions, the Run path |
| `model/outbox/` | Outbox list rules and exact commands |
| `model/clock/` | Countdown arithmetic and grade ladder |
| `model/rows/` | Row state, row action, grouping and filters, cells, history |
| `model/menu.ts` | Right-click menu entries |
| `components/band/` | `CraBand`, `Countdown`, `BandSide`, `track/` (`Rail24`, `GradeLadder`, `EvidenceStrip`) |
| `components/table/` | `DecisionsTable`, `DecisionRow`, `HistoryRow`, `MoveCell` |
| `components/outbox/` | `OutboxDrawer` (content of the shared `BottomDrawer`), `OutboxItem` |
| `components/inspector/` | `NeedsInspector`, `Sec`, `Acts`, `items/` (one view per selection) |
| `components/chrome/`, `components/shared/` | Toolbar, sidebar, legend, outbox icon; glyphs, chips, "does not" list |
| `hooks/` | Reducer + notices, elapsed clock, keys, menus |

## Tests
74 vitest tests, all on the pure model:
- `model/reducer.test.ts`: read before act, staging and running, gaps, actions that skip the outbox, view state.
- `model/outbox/outbox.test.ts`, `model/outbox/commands.test.ts`: list order (clock first), replace on restage, what
  each decision stages, exact gap and Copy Command commands.
- `model/clock/clock.test.ts`, `model/clock/grades.test.ts`: clock arithmetic, grade ladder.
- `model/rows/rows.test.ts`, `model/rows/grouping.test.ts`: row state, filters, one action per row, cells,
  grouping, keyboard order.
- `model/menu.test.ts`: row and group menus.
- `src/server/actions/__tests__/screens.test.ts`: every decision's intent is planned by the server (done, or refused
  with the reason the screen shows).
- `src/server/data/__tests__/parity.test.ts`: `pickNeedsYouDemo` reads the same from the live source as from demo.

## Status and limits
- The slice is read through `getDataSource()` (`src/server/data`), but the screen is built around five specific
  inbox items and the `!44` incident. In live mode without them, `NeedsYouEmpty` is shown.
- Run goes through the server for the promotions (n1, n4), the CRA mark (n2) and the gap MRs: the outbox shows the
  server's planned commands, Run confirms them, and a refusal disables Run with the reason. In the demo data
  `dep-bump.patch` is already Hands-off, so the server refuses n1's promotion ("a promotion goes up"); the fixture
  and the ledger disagree, and the refusal is the honest answer until the fixture is fixed.
- In demo mode the server plans but never executes: no `glab` command runs; screen state lives in the reducer and is
  lost on reload. The CRA clock counts down from a fixed `remainingSec` (19 h 12 m) from page load.
- The CRA case, its draft, evidence, diffs, MR numbers and the week's ledger are invented fixtures in `data/`.
