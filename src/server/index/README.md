# Local index (PGlite)
Belay's cache of GitLab plus the ledger, in embedded Postgres (`@electric-sql/pglite`). Data lives in
`$BELAY_DATA_DIR/index` (default `.belay/index`, gitignored); tests use `memoryIndex()`. Delete the folder and
nothing is lost: every table is rebuilt from the source in the last column.

| Table | Holds | Rebuilt from |
|---|---|---|
| `fleet_group`, `project`, `project_stage` | groups, projects, nine rungs per project | GitLab group/project API + maturity scan |
| `trust_class`, `class_tier` | classes; per project and class the tier recorded in tier-state.yml, capped by the policy, its lease, record and last move (`no_record` when no agent holds the class, `refused` when several do, with each holder's tier: read by `views/standing.ts`) | `belay-policy` trust-policy.yml, tier-state.yml + ledger |
| `ledger_event` | hash chain, unique `(project_id, seq)`, append-only trigger | `belay-ledger/events/<id>.jsonl` (`resetLedger` then re-append) |
| `task`, `proof` | tasks and Proof Blocks | MR notes (`belay-proof`, `Belay-Task:` trailer) + ledger |
| `proposal` | Needs-you inbox; gap picks are children of one `gap` item | GitLab state, CRA clocks, maturity scan |
| `stage_cell` | every maturity scan, latest read | repository scan (`engine_version` pinned) |
| `pairing`, `setup_step` | where Belay is paired, what each step measured | `belay doctor` probes |
| `poll_state` | last good poll and last error per source (`project:<id>`) | the poller |
| `commands_run` | every write the operator confirmed, recorded before it runs | **not rebuildable**: Belay's own audit |

Project columns `proofs_*_7d`, `demotions_7d`, `needs_you`, `cra_open` are roll-ups the poller recomputes from the
tables above. NULL means unknown, never zero.

## Layout

- `db.ts` open, shared instance (`getIndex`), `closeIndex`. `migrations/` versioned SQL as TS modules; `migrate()`
  is idempotent and checksum-guarded. `repositories/` typed, parameterised functions per table (no ORM).
- `views/` return the shapes in `src/lib/demo` (`getFleet`, `getNeedsYou`, `getActionClasses`, `getMaturity`,
  `getTasks`, and `getEvents`: the deep project's recent events, dated only by what the index holds with a time). Countdowns and ages are computed from stored instants with a `now` argument. Where the index cannot
  know a value the field is `null` (types widened in `views/types.ts`).
- `seed/` loads `belay-demo.json` anchored at `SEED_NOW` (14:22 UTC) so tests can prove the views match the demo.

## Ledger

`appendLedgerEvents(db, events)` checks seq, `prev_hash` and a recomputed hash (`src/schemas/ledger.ts`) in one
transaction; a bad chain throws `LedgerChainError` and writes nothing. Re-importing stored events is a no-op; a
different event at a stored seq is rejected as a fork. `verifyStoredChain` re-verifies from genesis.

## Not yet served
Tracks, loop, setup phases, cockpit and the event feed have no view yet; `pairing`/`setup_step` have repositories
only. Times are formatted in UTC.

## Decision: the standing key `refused`
The stored standing key `refused` stays, with no migration 0006. Every screen shows it as Split, per holder
(`views/standing.ts:31-33`). A rename is backlog.

## Added by B6
`setProjectState` (the poller marks a failed feed `stale`), `deleteProofs` (a proof for an older head is removed), and `openIndex`
now creates the data folder and its parents (PGlite only made the last one, so a first start with no `.belay/` failed).
