# Needs you (`/needs-you`)

Every decision that waits for a person, and nothing else. Port of the approved "Desk + outbox" prototype.
The route file reads the demo slice on the server (`data/pick.ts`) and renders `NeedsYouScreen`.

## Parts
- `components/band/` the CRA band: live countdown, 24 h rail, grade ladder (attested struck out), 6/6 evidence.
- `components/table/` decisions grouped By kind / project / deadline, one action per row, "Decided this week".
- `components/outbox/` the drawer: staged writes with exact command + diff, Run, Remove, sent this session.
- `components/inspector/` one view per selection; "The click" lists what a button will and will not do.
- `components/chrome/` toolbar, sidebar filters, legend. `components/shared/` marks used by the above.
- `hooks/` reducer + notices, right-click menus, keyboard map, 1 s clock tick.

## Logic (`model/`, all pure, 74 vitest tests)
- `reducer.ts` + `act.ts` + `run.ts`: every button is an `ActionId`. Staging sends nothing; `Run` is the only send.
  Retire, Not yet and the runner check skip the outbox. Reading the draft or note opens the gate.
- `rows/`: row state, the one action per row, grouping, filters, keyboard order. `outbox/`: list rules, commands.
- `clock/`: countdown math and the grade ladder. `menu.ts`: right-click entries as data.

## Data
`data/*.ts` are the prototype's invented constants (CRA detail, 16 proofs, diffs, week ledger). Titles, rungs, rules and
the !44 incident come from `@/lib/demo`. Everything on the screen is illustrative and says so.

## On the shared kit
Chips are `Chip compact`, the diff is `DiffBlock`, and `outbox/OutboxDrawer` is the content of the shared `BottomDrawer`.
`shared/DecisionGlyph` (the 10 px state glyph) stays local.
