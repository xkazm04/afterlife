# Task (F5)

Route `/task/[id]` (`/task` redirects to the data source's first task). Ported from the approved "Cross-examination" prototype. Reads only: nothing on this screen writes.

## Parts
- `TaskScreen.tsx` composes the Window: toolbar (verdict lozenge, proof-class menu, Replay), docket in
  the sidebar, the pane, the inspector, the legend behind the status-bar `?`.
- `components/`: `header/` (then vs now tier, state, seeded), `equation/` (verdict word, terms,
  tally), `chain/` (7-link receipt chain), `court/` (claims, checks, SVG ties), `inspector/`
  (ruling, words, counts toward, exhibits, ledger, trace, proof), `toolbar/`, `docket/`, `help/`.
- `hooks/`: `useSelection`, `useReplay` (timers, toast, status), `useTaskKeys`, `useTieGeometry`
  (measures cards, re-measures on resize, inspector toggle and text size).
- `model/` (pure, tested): `build/` merges the demo dataset with the fixtures into `TaskView` and chains
  the ledger hashes; `verdict/` the verdict (the schema's `verdictOf` over the checks; a `decidedBy: 'human'` check is a struck term), equation terms, replay sequence; `court/` selection,
  arrow keys, tie classification; `docket/` filters, stepping, key map; `exhibits.ts`.

## Data
`data/details/*.ts` is the prototype's `TASK_DETAIL`, one typed file per task (7, including the seeded
FAIL `01J8Q8`). The data source wins where it has a value (`getTasks()`); three tasks
(`01J8Q8`, `01J8QA`, `01J8Q7`) carry their own base row. Every other data-source task (a live task the
fixtures do not know) is drawn after them from its own fields alone (`sourceTask`, `fixture: false`):
its proof's checks keep the claim each answers, and what only a fixture holds (agent, flow run, chain,
ledger, trace, envelope, policy) is shown as not held, never borrowed. Demo mode draws exactly the seven.
`data/pageFacts.ts` has the page clock and the proof-class list. Ids the docket does not draw call `notFound()`.

## Honesty
Claims, agent words, the hunk and the trace are untrusted: rendered as text, ligatures off, never a
term of the verdict. Unknown is dashed, an undecided check is a struck term (never a pass), unreached
chain links are dashed n/a, replay re-derives from the ledger and never re-runs the agent.

## On the shared kit
- Chips are `Chip` (plain, invariant), the object link is `controls/ObjectLink`, and the docket's "2 / 7" is the
  `aux` of its `SidebarSection`.
- `components/equation/Term.tsx` (the equation term) stays local.
- The lozenge-as-filter and the class menu already work with the shared parts.

## Tests
`npx vitest run src/app/features/task`
