# Task (`/task`, `/task/[id]`)

> Does this agent task's proof hold up, check by check, against what the agent claimed?

## What it does
- `/task` has no content of its own: it redirects to the first task the docket draws, or draws `TaskEmpty` in the
  window when it draws none. `/task/[id]` shows one task; an id the docket does not draw is a 404.
  `?check=<id>` / `?claim=<id>` opens that card; otherwise a task opens on its verdict's first deciding check.
- The pane cross-examines one task:
  - header: tier then vs tier now, state, a "seeded" chip where it applies;
  - **verdict equation**: the verdict word (PASS / FAIL / INCONCLUSIVE / UNKNOWN, derived from the checks), one term
    per check (✓ / ✗ / ?), the tally, a "FAIL because …" line naming the deciding terms, and a "stored X - checks say
    Y" flag when the stored word disagrees;
  - **receipt chain**: seven links, each a GitLab object (pipeline, policy, jobs, MR, deploy revision, ledger row), with
    unreached links dashed and marked n/a;
  - **court**: the agent's claims on one side, the engine's checks on the other, joined by SVG ties (green holds, red
    contradicts, dashed unknown); a claim with no check gets a dashed "?".
- Clicking a claim or check selects it; arrow keys walk a column or cross along a tie; Esc clears; `n` walks the
  deciding checks of the visible tasks. The selection is written back into the URL.
- The inspector shows the selection's ruling, the Proof Block (rule, engine, digest, policy, ledger read), the agent's
  words, what the task counts toward, the exhibits its proof class requires (quoted hunk, reruns, CRA clock, diff
  envelope), the ledger rows and `trace.jsonl`.
- The sidebar docket lists the drawn tasks (demo: the seven fixtures); the toolbar filters by verdict (lozenge: all,
  pass, fail, open; or `f` for fail only) and proof class, and has **Replay** (`r`, off when the task holds no ledger
  rows). `[` / `]` step through visible tasks; `w` toggles the agent's words.
- **Replay** re-derives the verdict from the ledger: claims first, then one check lands per 750 ms while the matching
  ledger row lights, then the toast "Replayed ledger #a–#b · N rows, <chain check> · VERDICT · agent not re-run", where
  the chain check is "sha256 chain verified", "illustrative hashes match" or "HASHES DO NOT MATCH, chain broken at #n";
  the status line ends the same way ("identical to the record" or "chain broken at #n").

## How it works
- `src/app/(app)/task/page.tsx` (server) redirects to `firstTaskId()` (the first task `loadTasks()` draws).
  `src/app/(app)/task/[id]/page.tsx` (server) calls `loadTasks()`, finds the id or calls `notFound()`, and renders
  `TaskScreen` with all tasks, the current one, `loadPageFacts()` and the opening selection (`selectionFromQuery`).
- `model/build/loadTasks.ts`: `loadTasks()` reads tasks, tracks and action classes from the DataSource and calls
  `buildTasks` with the fixtures in `data/details/` (`TASK_DETAIL`, and `TASK_ORDER`, its keys). In live mode only the
  source's tasks are drawn (a source task with no fixture from its own fields, `sourceTask`), and each task's ledger is
  its merge request's slice of the real chain (`build/chain/taskLedger.ts`: `chainLedgers`, its check the data source's
  `getLedgerCheck()`, which verifies the chain once per poll; no request re-hashes it). `build/loadPage.ts`: `loadPageFacts()` (subtitle, poll age).
- Pure model (`model/`):
  - `build/buildTasks.ts`: merges each dataset row (or a fixture's own `local` base row) with its fixture into a
    `TaskView`. The dataset wins where it has a value; the dataset quote replaces the hunk's added line; tier now comes
    from the action class; `seeded` comes from the fixture or the title/reason text. A fixture without base row or proof
    is dropped, never invented.
  - `build/ledger.ts`: `chainLedger` (each FNV-1a hash covers the previous hash and the row), `firstBrokenSeq` (the seq of
    the first row that does not verify, or null).
  - `verdict/verdict.ts`: `derivedVerdict` (the schema's `verdictOf` over `proofChecks` and the envelope; the stored word
    is only compared), `isStruck` / `termKind` (a struck check is open, whatever its ok), `KIND_GLYPH`, `tally`,
    `claimStatus` (upheld, contradicted, open, no weight), `ruleWord`.
  - `verdict/reasons.ts`: `verdictReasons`, `becauseLine`, `openingSelection`, `selectionFromQuery`, `selectionHref`,
    `nextReason` (the `n` key).
  - `verdict/equation.ts`: `equationTerms`, `verdictWord` ("checking…" until every term has landed).
  - `verdict/replay.ts`: replay state (`null` / `-1` / n), `nextReplay`, `ledgerRowAt`, `ledgerBreak`, the status and
    toast texts.
  - `court/selection.ts`, `court/ties.ts`: selection, arrow-key moves, chain link to light, `ties`, untested claims,
    tie geometry.
  - `docket/filters.ts`, `docket/keys.ts`: `visibleTasks`, `verdictCounts`, `toggleFailOnly`, `stepTask`,
    `idAfterFilter`, `statusLine`; `actionFor(key, ctx)` and `TASK_KEYMAP`.
  - `exhibits.ts`: `exhibitKinds`, `clockElapsed`, `isDenyPath` (a CI file on a class that may not touch CI config),
    `hasMarkup`.
- Hooks: `useSelection`, `useReplay` (timers, toast, status), `useTaskKeys`, `useTieGeometry` (measures cards,
  re-measures on resize, inspector toggle and text size), `usePageClock`.

## Rules it keeps
- Reads only: nothing on this screen writes; the status line ends "reads only".
- The verdict every consumer draws is derived from the checks, never read from the stored word.
- Replay re-derives from the ledger and never re-runs the agent; it states the chain check as it was computed.
- A check a person decides (`decidedBy: 'human'`) is a struck term: never a pass and never a fail, in the equation, the
  tally, the court card, its tie, the claim's status and the ruling alike. An unknown result is `?`, drawn dashed; a
  term is never colour alone.
- Claims are never terms of the verdict. Claims, agent words, the hunk and the trace are untrusted text: rendered as
  typed (ligatures off, markup noted, never obeyed).
- Unreached chain links are dashed n/a; an untested claim gets "no weight", not a pass.
- Filters only hide tasks; they never change one. Seeded tasks carry a "seeded" chip.

## Code map
| Path (under src/app/features/task/) | Role |
|---|---|
| `TaskScreen.tsx` | Composes the Window: toolbar, docket, header, equation, chain, court, inspector, status |
| `data/details/` | One fixture per task (`q4`, `q7`, `q8`, `q9`, `qa`, `qb`, `qc`), `TASK_DETAIL` and `TASK_ORDER` (its keys) |
| `data/pageFacts.ts` | Page clock, ledger age, policy sha, `PROOF_CLASSES` (from `@/schemas/proof`) |
| `model/types.ts` | `TaskView`, claims, checks, chain, ledger types |
| `model/build/` | `loadTasks` and `loadPageFacts` (server), `buildTasks`, illustrative ledger chain, `chain/` (real chain slice) |
| `model/verdict/` | Verdict, reasons, equation terms, replay sequence |
| `model/court/` | Selection, arrow keys, ties |
| `model/docket/` | Filters, stepping, status line, key map |
| `model/exhibits.ts` | Which exhibits a proof class shows; clock and deny-path helpers |
| `components/header/`, `equation/`, `chain/`, `court/` | `TaskHeader`; `VerdictEquation`, `Term`, `EngineLine`; `ReceiptChain`; `Court`, `ClaimCard`, `CheckCard`, `Ties` |
| `components/inspector/` | `TaskInspector`, `SelectionRuling`, `ProofBlock`, `Exhibits`, `LedgerRows` |
| `components/toolbar/`, `docket/`, `help/`, `StatusTag.tsx` | `VerdictLozenge`, `ClassMenuButton`, `ReplayButton`; `Docket`; `TaskLegend` |
| `hooks/` | Selection, replay, keys, tie geometry, page clock |

## Tests
- `model/build/buildTasks.test.ts`: seven tasks in order and `/task`'s target; exactly one failing task (seeded
  `01J8Q8`); every stored verdict equals the derived one; 7-link chains with n/a links; checks and claims point at
  real links and claims; dataset wins; quote in the hunk; tier now and seeded; ledger hashes chain; every undecided
  check is decided by a person; source tasks drawn from their own fields.
- `model/build/ledger.test.ts`: deterministic hashes, links to the previous hash, a changed row is detected.
- `model/build/chain/taskLedger.test.ts`: a merge request's slice of the real chain, sha256 rows, the first broken seq;
  `model/build/liveDocket.test.ts`, `engineBlock.test.ts`, `withQuote.test.ts`: the live docket, source tasks, the quote.
- `model/verdict/verdict.test.ts`, `model/verdict/replay.test.ts`, `model/verdict/reasons.test.ts`: verdict, struck
  terms, tally, claim status, equation; replay sequence, ledger row mapping, messages; deciding terms, `?check=`, `n`.
- `model/court/court.test.ts`, `model/docket/docket.test.ts`, `model/docket/keys.test.ts`, `model/exhibits.test.ts`:
  selection, arrows, ties; filters, stepping, status line, key map; exhibits.
- `__tests__/` and `components/*/*.test.tsx`: rendered checks (aria labels, nested interactives, card selectors, empty
  sections, struck checks, the legend against `TASK_KEYMAP`, the ledger read).
- `src/server/data/__tests__/parity.test.ts`: `loadTasks` is the same from the live source as from demo, apart from the
  ledger (live reads the chain).

## Status and limits
- Task rows, tracks and action classes come from `getDataSource()` (`src/server/data`). Claims, checks maps, chains,
  traces and envelopes are the screen's fixtures; three tasks (`01J8Q8`, `01J8QA`, `01J8Q7`) carry their own base row.
  In live mode a fixture with no source task is not drawn, and a source task with no fixture is drawn from its own
  fields: what only a fixture holds (agent, flow run, chain, trace, envelope, policy) reads "not held".
- Demo ledgers are the fixtures' rows under an illustrative FNV-1a hash; live ledgers are the real chain's sha256 rows.
  The demo page clock is fixed at 14:22.
