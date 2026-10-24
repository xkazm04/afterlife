# Task (F5)

Route `/task/[id]` (`/task` redirects to the data source's first task, or draws `TaskEmpty` in the window when it holds none). Ported from the approved "Cross-examination" prototype. Reads only: nothing on this screen writes.

## Parts
- `TaskScreen.tsx` composes the Window: toolbar (verdict lozenge, proof-class menu, Replay), docket in
  the sidebar, the pane, the inspector, the legend behind the status-bar `?`.
- `components/`: `header/` (then vs now tier, state, seeded), `equation/` (verdict word, terms,
  tally), `tabs/` (the pane's tab list, the Ledger tab's rows and trace), `chain/` (7-link receipt chain), `court/`
  (claims, checks, SVG ties), `inspector/` (ruling, Proof Block card, words, counts toward, exhibits), `toolbar/`,
  `docket/`, `help/`.
- `hooks/`: `useSelection`, `useReplay` (timers, toast, status), `useTaskKeys`, `useTieGeometry`
  (measures cards, re-measures on resize, inspector toggle and text size).
- `model/` (pure, tested): `build/` merges the demo dataset with the fixtures into `TaskView` (in live mode: the source's tasks, each with its fixture if it has one) and chains
  the ledger hashes; `verdict/` the verdict (`derivedVerdict`: the schema's `verdictOf` over the checks, which every consumer draws; the stored word is only compared, and a disagreement shows as a "stored X - checks say Y" flag; a `decidedBy: 'human'` check is a struck term), equation terms, replay sequence; `court/` selection,
  arrow keys, tie classification; `docket/` filters, stepping, key map; `exhibits.ts`.

## Layout and tabs
The pane reads top down in one order. The header and the verdict equation always stay on top: the verdict is never a tab
away. Under them, one tab at a time (`components/tabs/TaskTabs`, a task-local tab list: ← → Home End move and open,
roving tabIndex, `role=tab` / `tabpanel` tied both ways):
- **Court** (the default): the claims against the checks, with their ties.
- **Receipt chain**: the seven links at the pane's full width (on a pane under 68em it still wraps, four links over three).
- **Ledger**: the hash-chained ledger rows as a full-width table (seq, time, kind, row, prev → hash; the row a replay
  lights is marked), then `trace.jsonl`. The inspector keeps only the Proof Block's "Ledger read".

Only the open panel is mounted, so the court measures its ties when it mounts. The open tab is in the URL: `?tab=chain`
or `?tab=ledger`, the Court is no key (`model/tab.ts`: `tabFromQuery`, `withTab`, `stepTab`). The route reads it on the
server next to the selection, so a reload opens the same tab with no flash, and the screen writes it back with the
selection; `keepForeignKeys` owns `tab` as it owns `check` and `claim`. A key that selects a card (the arrows, `n`) opens
the Court first; another task (the docket, `[ ]`, `n` crossing tasks) opens on its own URL's tab, the Court. A term clicked
in the equation selects its check without changing the tab: the chain lights its link, the inspector shows its ruling.

## Data
`data/details/*.ts` is the prototype's `TASK_DETAIL`, one typed file per task (7, including the seeded
FAIL `01J8Q8`). Demo mode draws exactly the seven. Live mode draws only the data source's tasks
(`getTasks()`): a fixture with no source task (`01J8Q8`, `01J8QA`, `01J8Q7` on the fake group) is neither drawn
nor counted, and `/task/<its id>` is `notFound()`. A source task that has a fixture keeps its render detail, and
the source wins where it has a value; one with no fixture is drawn from its own fields alone (`sourceTask`,
`fixture: false`): its proof's checks keep the claim each answers, and what only a fixture holds (agent, flow run,
chain, ledger, trace, envelope, policy) is shown as not held, never borrowed. `firstTaskId()` names a drawn task,
and the subtitle, status line and inspector "Ledger read" come from the source, not the prototype's constants.
The inspector's "Proof Block" card is open for every task: the verdict rule in one sentence, then the engine, digest, policy and ledger read the task holds; a pin it does not hold (a source task with no fixture) reads "not held", never a borrowed value.
`data/pageFacts.ts` has the page clock and the proof-class list. Ids the docket does not draw call `notFound()`.
The ledger: in live mode every task's rows are its merge request's slice of the real chain (`ds.getLedger()`, events whose subject is `mr` with `!${iid}` equal to the task's `mr`), each with its seq, sha256 hash and prev_hash, never the fixture's; a task with no merge request, or one the chain never names, holds none. `model/build/chain/taskLedger.ts` (imported only by `loadTasks`) takes the whole chain's first broken seq from `ds.getLedgerCheck()`, which the data source verifies once per poll with `verifyChain` (live: when the snapshot is built), so no `/task` request re-hashes the chain; `TaskView.ledgerCheck` (`hash: 'sha256' | 'illustrative'`, `brokenAt`) is the plain result a client component reads. Demo keeps the fixture rows, marked illustrative (FNV).

## Honesty
Claims, agent words, the hunk and the trace are untrusted: rendered as text, ligatures off, never a
term of the verdict. Unknown is dashed, an undecided check is a struck term (never a pass), unreached
chain links are dashed n/a, replay re-derives from the ledger and never re-runs the agent.
Replay states the chain check as it was computed: "sha256 chain verified", "illustrative hashes match" (the FNV rows re-checked from themselves), or "chain broken at #n"; the Ledger tab's heading says the same.

## On the shared kit
- Chips are `Chip` (plain, invariant), the object link is `controls/ObjectLink`, and the docket's "2 / 7" is the
  `aux` of its `SidebarSection`.
- `components/equation/Term.tsx` (the equation term) stays local.
- The lozenge-as-filter and the class menu already work with the shared parts.

## Tests
`npx vitest run src/app/features/task`

## Opening on the reason
`model/verdict/reasons.ts` names the terms that decided a verdict, in check order: a FAIL's failing engine checks, then an
envelope breach; an INCONCLUSIVE's undetermined checks. A struck term is never a reason; each carries `alone` (setting it
right by itself changes the verdict). A task opens on its first deciding check (a PASS opens on nothing); `?check=<id>` or
`?claim=<id>` opens that card instead, and the screen writes the selection back with `history.replaceState`, so
`/task/01J8Q8?check=envelope` is an address for a reason. The equation names them under the word ("FAIL because envelope ·
envelope breached"), and `n` walks every reason of the visible tasks, wrapping.
