# Needs you (`/needs-you`)

Every decision that waits for a person, and nothing else. Port of the approved "Desk + outbox" prototype.
The route file reads the view on the server (`data/pick.ts`, `loadNeedsYouView`). Demo: the desk, `NeedsYouScreen`. Live:
never the desk (it is built around the demo's seeded n1/n2/n4/n5, the !44 incident and the patch-bump record): the
group's own open items (`NeedsYouLive`, minus any the demo seeded into the index), or `NeedsYouEmpty`, which says how many
seeded ones it does not show.

Live desk (`NeedsYouLive`, `components/live/desk/`, `hooks/useLiveDesk`, `hooks/useLiveActs`, `model/desk/`): the demo
desk's skeleton over the group's own items. `NeedsYouLive` is the composer: `model/desk` `deskItems` turns the open items
and the week's decided list (`getDecided`, passed by `loadNeedsYouView` with `now`, the time the view was read, so every
age agrees between the server HTML and the hydrated page) into rows; `LiveDesk` draws them in the Window:
- `LiveBand`: "N decisions · M projects · oldest Xd" (`summarize`); the oldest part is left out when no open row has a
  known start, never "0d" (`model/clock/age.ts`).
- `LiveTable`: `groupDesk` By kind / By project / By deadline, "Decided this week" last; each row its glyph, title,
  project, move (tiers, or rungs with an unknown rung now as "R?"), when (deadline, or age; unknown is a "?" chip) and
  Stage. Amber is only on rows that wait for a person: a staged, sent or decided row is not.
- `LiveInspector`: "The click": the row's reason and what it does, Stage, then `components/live/LiveAct` (rule counts,
  the class as it is now, the server's commands and diff, Run, the answer). A read-only row shows its `readOnly` text; a
  decided row shows when (UTC) and by whom (unknown when the act did not record it).
- `LiveOutbox`: staged rows as the demo's `OutboxItem` cards (adapted from the desk's rows) with Run all, then "Sent
  this session": a done confirm's row leaves the rows on the refresh (only open proposals are listed), so it stays here
  with the response's answer and the MR it named. A failed confirm leaves the proposal open in its row with its answer.

Writes (`write/live.ts`): a promotion or a re-admit is a promote-class policy MR (`write/promote.ts`, the desk's door);
a live gap with its template is an apply-gap-template MR (`write/gapTemplate.ts`); both go through `previewAction` and
`confirmAction(intent, previewId)`, never anything else. The selected and the staged rows ask for their exact write
(`useLiveActs`, one slot per row in `model/slot/liveActs.ts`); Run confirms that preview only; an unsure confirm asks
`recallAction` first. Run all (`useLiveDesk.runAll`) confirms each staged row's current preview in staging order (asking
for one first when there is none), records each answer with the server's words (`outResult`: only a done ran; refused
and changed ran nothing; no answer is failed) and goes on past a refused or failed one. Keys: arrows move, Left/Right
shut and open a group, Space stages or unstages the selected row, Enter focuses the inspector. `?item=<id>` opens a row
selected (Ladder's p). Sign-offs and setup steps stay read-only and say where to act.

Live evidence (`model/evidence/evidence.ts`, `components/live/LiveEvidence`): `loadNeedsYouView` joins each promotion and
re-admit to its class as the same snapshot holds it (nothing new is read) and passes `evidence` by item id. Beside Run:
the tier now, the record, the five newest counted outputs linked to GitLab, guardrail blocks, the gate and a re-admit's
trigger, in the Ladder's words. When the class moved since the proposal (a promotion's `from`, a re-admit's quarantine),
Run is disabled and `useLiveActs` refuses it (Run and Run all); a class the index does not hold says so and invents no record.

Known gap: the repo has no DOM test environment. `package.json` has no jsdom or happy-dom, and `vitest.config.ts:13` sets
`environment: 'node'`. So `NeedsYouLive.test.tsx` renders `LiveDesk` with a hand-built desk state and `components/live/desk/LiveDesk.test.tsx`
its parts over hand-built rows; the recording of a done confirm into "Sent this session" is the pure
`model/slot/liveActs.ts` reducer that `useLiveActs` wraps, and the outbox's order the pure `model/desk` `outReduce`, tested
there. The hooks' effects (ask, Run all's loop, the keys' focus) have no test without a DOM.
Adding a DOM environment is a dependency decision that has not been taken.

## Layout
The desk and the live desk are one scrolling page (a `PaneScroll`): the runner strip (only when the cycle runner left
something), the band (CRA on the desk, the summary on the live desk), then the decisions table at its natural height
(`OutlineTable flow`). The page scrolls, not the table; its header and group rows stick to the page. The outbox docks
below the page, outside the scroller, when it is open. The runner's sheet sits over the whole pane.

## Parts
- `components/band/` the CRA band: live countdown, 24 h rail, grade ladder (attested struck out), one evidence tick per link, resolved only as far as the fixture's count says.
- `components/table/` decisions grouped By kind / project / deadline, one action per row, "Decided this week".
- `components/detail/` `/needs-you/[item]`: one decision as short cards (the inspector), opened from a row's title or Enter. It
  shares the desk's state with the list through the layout's `NeedsStore`, so a write staged there lands in the list's outbox
  and staging sends the viewer back to `/needs-you`. Only the desk has pages (`loadNeedsItem`); the live list decides in place.
- `components/outbox/` the drawer: staged writes with exact command + diff, Run, Remove, sent this session.
- `write/promote.ts` the policy MRs, through the server actions: n1 (promote) and n4 (re-admit, a promote-class to
  Assisted). `previewAction` when the decision is selected or staged; its commands and diff are what the outbox and the
  inspector show (`model/outbox/policy.ts`); Run is `confirmAction(intent, previewId)` (`hooks/useNeedsYou.ts`), and the
  reducer records only the answer: done names the MR GitLab opened (or says simulated in demo), failed, changed (the new
  write replaces the old) and refused say so.
- `write/desk.ts` the gaps (g1..g4), through Maturity's gap door (`maturity/write/gap.ts`, the server's stage-gap-mr): the same
  ask-when-in-view, confirm-by-previewId, answer-only-what-the-response-says as the policy MRs. The probe (g4) and a gap with no
  proposal files are not sent and say why. The files are Maturity's proposal data, not copied here. Nothing moves a rung.
- `components/inspector/` one view per decision (its page); "The click" lists what a button will and will not do.
- `components/runner/` the cycle runner's decisions. On the desk and the live desk, `RunnerStrip` (`useRunnerStrip`): one
  line, "From the cycle runner · N merges · M parked" (a zero part left out) and Open, which opens `RunnerSheet`, the
  cards in a `Sheet` with the counts and the `/runs` link (Escape or the veil closes it; focus goes back to Open). The
  empty pages draw the cards in place (`RunnerNeeds`, a short page with nothing else to push down). The cards: a mergeable wave not yet in its base (the exact `git -C <path> switch / merge --ff-only / push`, from
  `.belay/fleet.yml`'s path) and the lanes its repo's newest wave parked. Read by `readDesk()` (`src/server/runs/`, folded by
  `src/lib/runs/desk/`), real local data in demo and live alike. Text only: Belay merges and pushes nothing.
- `components/chrome/` toolbar, sidebar filters, legend. `components/shared/` marks used by the above.
- `hooks/` reducer + notices, right-click menus, keyboard map, 1 s clock tick (`ClockProvider`, held by `NeedsStore` in the
  layout, so the list and a decision's page share one clock).

## Logic (`model/`, all pure, vitest tested)
- `reducer.ts` + `act.ts` + `run.ts`: every button is an `ActionId`. Staging sends nothing; `Run` is the only send.
  Retire, Not yet and the runner check skip the outbox and write nothing (Belay has no retire write: tier-state.yml has
  no retired tier). Reading the draft or note opens the gate.
- `rows/`: row state, the one action per row, grouping, filters, keyboard order. `outbox/`: list rules, commands.
- `clock/`: countdown math and the grade ladder. `menu.ts`: right-click entries as data.
- `slot/`: one server-planned write's lifecycle (asking, ready, refused, sending, answered, unsure), the rule the desk
  (`run.ts`) and the live list (`slot/liveActs.ts`) both follow. A confirm with no answer is unsure: the write may or may
  not have run, so Run stays closed until it is asked for again (desk: Ask again in the outbox or the inspector; live: in
  the row). A refused preview can be asked for again on the desk too. Each live item sends on its own.
- Ask again on an unsure write first asks the server what its previewId did (`recallAction`, server/actions/runs/):
  `recalled` in `slot/slot.ts` settles a recorded done or failed as a confirm's answer, reopens Run on the kept preview
  when nothing ran (never), stays unsure saying the write is still running (running), and stays unsure with Check GitLab
  when the server cannot say (unknown): the next Ask again then asks for the write afresh. The desk folds the recall in
  with `run.ts` `recalledItem` (the hook's own step, `useNeedsYou`); the live list with liveActs' `recalled` action.

## Data
`data/*.ts` are the prototype's invented constants (CRA detail, week ledger, the runner step: `npx belay doctor`, which takes no arguments; its check result is the demo's simulation and says so, with no job number). n1's accepted proofs are
qa.file-bug's own illustrative bug filings; their count, the edited share and the section's aux text come from that class's
record in the demo fixture (`pick.ts` reads it, `proofsAux` words it, `data/promote.test.ts` pins them). The policy MRs' commands and
diffs are not among them: the server plans those. Titles, rungs, rules and
the !44 incident come from `@/lib/demo`. Everything on the screen is illustrative and says so.

## On the shared kit
Chips are `Chip compact`, the diff is `DiffBlock`, and `outbox/OutboxDrawer` is the content of the shared `BottomDrawer`.
`shared/DecisionGlyph` (the 10 px state glyph) stays local.
