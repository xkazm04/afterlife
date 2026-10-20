# Task (`/task`, `/task/[id]`)

> Does this agent task's proof hold up, check by check, against what the agent claimed?

## What it does
- `/task` has no content of its own: it redirects to the first task of the data source (or `/` when there is none).
  `/task/[id]` shows one task; an unknown id is a 404.
- The pane cross-examines one task:
  - header: tier then vs tier now, state, a "seeded" chip where it applies;
  - **verdict equation**: the verdict word (PASS / FAIL), one term per check (✓ / ✗ / ?), and the tally;
  - **receipt chain**: seven links, each a GitLab object (pipeline, policy, jobs, MR, deploy revision, ledger row), with
    unreached links dashed and marked n/a;
  - **court**: the agent's claims on one side, the engine's checks on the other, joined by SVG ties (green holds, red
    contradicts, dashed unknown); a claim with no check gets a dashed "?".
- Clicking a claim or check selects it; arrow keys walk a column or cross along a tie; Esc clears.
- The inspector shows the selection's ruling, the agent's words, what the task counts toward, the exhibits its proof
  class requires (quoted hunk, reruns, CRA clock, diff envelope), the ledger rows, `trace.jsonl` and the proof.
- The sidebar docket lists the seven tasks; the toolbar filters by verdict (lozenge, or `f` for fail only) and proof
  class, and has **Replay** (`r`). `[` / `]` step through visible tasks; `w` toggles the agent's words.
- **Replay** re-derives the verdict from the ledger: claims first, then one check lands per 750 ms while the matching
  ledger row lights, then the toast "Replayed ledger #a–#b · N rows, hashes match · VERDICT · agent not re-run".

## How it works
- `src/app/task/page.tsx` (server) redirects using `getDataSource().getTasks()[0]`. `src/app/task/[id]/page.tsx`
  (server) calls `loadTasks()`, finds the id or calls `notFound()`, and renders `TaskScreen` with all tasks and the
  current one.
- `model/build/loadTasks.ts`: `loadTasks()` reads tasks, tracks and action classes from the DataSource and calls
  `buildTasks` with the fixtures in `data/details/` (`TASK_DETAIL`) and `TASK_ORDER` from `data/pageFacts.ts`.
- Pure model (`model/`):
  - `build/buildTasks.ts`: merges each dataset row (or a fixture's own `local` base row) with its fixture into a
    `TaskView`. The dataset wins where it has a value; the dataset quote replaces the hunk's added line; tier now comes
    from the action class; `seeded` comes from the fixture or the title/reason text. A task without base row or proof is
    dropped, never invented.
  - `build/ledger.ts`: `chainLedger` (each FNV-1a hash covers the previous hash and the row), `ledgerIntact`.
  - `verdict/verdict.ts`: `checkKind`, `checkGlyph`, `proofChecks` + `taskVerdict` (the schema's `verdictOf` over the
    checks and envelope), `tally`, `claimStatus` (upheld, contradicted, open, no weight), `ruleWord`, `isStruck`.
  - `verdict/equation.ts`: `equationTerms`, `verdictWord` ("checking…" until every term has landed).
  - `verdict/replay.ts`: replay state (`null` / `-1` / n), `nextReplay`, `ledgerRowAt`, the status and toast texts.
  - `court/selection.ts`, `court/ties.ts`: selection, arrow-key moves, chain link to light, `ties`, untested claims,
    tie geometry.
  - `docket/filters.ts`, `docket/keys.ts`: `visibleTasks`, `verdictCounts`, `toggleFailOnly`, `stepTask`,
    `idAfterFilter`, `statusLine`; `actionFor(key, ctx)`.
  - `exhibits.ts`: `exhibitKinds`, `clockElapsed`, `isDenyPath` (a CI file on a class that may not touch CI config),
    `hasMarkup`.
- Hooks: `useSelection`, `useReplay` (timers, toast, status), `useTaskKeys`, `useTieGeometry` (measures cards,
  re-measures on resize, inspector toggle and text size).

## Rules it keeps
- Reads only: nothing on this screen writes; the status line ends "reads only".
- Replay re-derives from the ledger and never re-runs the agent; it reports whether the hashes chain.
- A check a person decides (`decidedBy: 'human'`) is a struck term: never a pass and never a fail. An unknown result
  is `?`, drawn dashed; a term is never colour alone.
- Claims are never terms of the verdict. Claims, agent words, the hunk and the trace are untrusted text: rendered as
  typed (ligatures off, markup noted, never obeyed).
- Unreached chain links are dashed n/a; an untested claim gets "no weight", not a pass.
- Filters only hide tasks; they never change one. Seeded tasks carry a "seeded" chip.

## Code map
| Path (under src/app/features/task/) | Role |
|---|---|
| `TaskScreen.tsx` | Composes the Window: toolbar, docket, header, equation, chain, court, inspector, status |
| `data/details/` | One fixture per task (`q4`, `q7`, `q8`, `q9`, `qa`, `qb`, `qc`) and `TASK_DETAIL` |
| `data/pageFacts.ts` | Page clock, ledger age, proof classes and their meanings, `TASK_ORDER` |
| `model/types.ts` | `TaskView`, claims, checks, chain, ledger types |
| `model/build/` | `loadTasks` (server), `buildTasks`, ledger hash chain |
| `model/verdict/` | Verdict, equation terms, replay sequence |
| `model/court/` | Selection, arrow keys, ties |
| `model/docket/` | Filters, stepping, status line, key map |
| `model/exhibits.ts` | Which exhibits a proof class shows; clock and deny-path helpers |
| `components/header/`, `equation/`, `chain/`, `court/` | `TaskHeader`; `VerdictEquation`, `Term`; `ReceiptChain`; `Court`, `ClaimCard`, `CheckCard`, `Ties` |
| `components/inspector/` | `TaskInspector`, `SelectionRuling`, `Exhibits`, `LedgerRows` |
| `components/toolbar/`, `docket/`, `help/`, `StatusTag.tsx` | `VerdictLozenge`, `ClassMenuButton`, `ReplayButton`; `Docket`; `TaskLegend` |
| `hooks/` | Selection, replay, keys, tie geometry |

## Tests
- `model/build/buildTasks.test.ts`: seven tasks in order and `/task`'s target; exactly one failing task (seeded
  `01J8Q8`); every stored verdict equals the derived one; 7-link chains with n/a links; checks and claims point at
  real links and claims; dataset wins; quote in the hunk; tier now and seeded; ledger hashes chain; every undecided
  check is decided by a person.
- `model/build/ledger.test.ts`: deterministic hashes, links to the previous hash, a changed row is detected.
- `model/verdict/verdict.test.ts`, `model/verdict/replay.test.ts`: verdict wording, struck terms, tally, claim
  status, equation; replay sequence, ledger row mapping, messages.
- `model/court/court.test.ts`, `model/docket/docket.test.ts`, `model/exhibits.test.ts`: selection, arrows, ties;
  filters, stepping, status line, key map; exhibits.
- `src/server/data/__tests__/parity.test.ts`: `loadTasks` is the same from the live source as from demo.

## Status and limits
- Task rows, tracks and action classes come from `getDataSource()` (`src/server/data`). Claims, checks maps, chains,
  ledgers, traces and envelopes are the screen's fixtures; three tasks (`01J8Q8`, `01J8QA`, `01J8Q7`) carry their own
  base row. In live mode a task with no fixture is not drawn.
- `/task` redirects to the data source's first task, not to `TASK_ORDER[0]`; in live mode that task may lack a
  fixture and 404. The ledger hash is an illustrative FNV-1a stand-in, and the page clock is fixed at 14:22.
- The displayed verdict word is the stored one; a test, not the screen, checks it equals the derived verdict.
