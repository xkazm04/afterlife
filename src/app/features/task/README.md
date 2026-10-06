# Task (F5)

Route `/task/[id]` (`/task` redirects to the first task). Ported from the approved "Cross-examination" prototype. Reads only: nothing on this screen writes.

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
FAIL `01J8Q8`). The demo dataset wins where it has a value (`lib/demo` tasks); three tasks
(`01J8Q8`, `01J8QA`, `01J8Q7`) carry their own base row. `data/pageFacts.ts` has the page clock and
the proof-class list. Unknown ids call `notFound()`.

## Honesty
Claims, agent words, the hunk and the trace are untrusted: rendered as text, ligatures off, never a
term of the verdict. Unknown is dashed, an undecided check is a struck term (never a pass), unreached
chain links are dashed n/a, replay re-derives from the ledger and never re-runs the agent.

## Kit candidates
- `components/Chip.tsx` neutral chip (`.chp`); `components/ObjectLink.tsx` read-only object link (`.ln`).
- `components/equation/Term.tsx` the equation term.
- `components/docket/Docket.tsx`: wants `SidebarSection` with a right-aligned `aux` count.
- The lozenge-as-filter and the class menu already work with the shared parts.

## Tests
`npx vitest run src/app/features/task`
