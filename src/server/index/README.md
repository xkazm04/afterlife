# Local index (PGlite)
Afterlife's cache of GitLab plus the ledger, in embedded Postgres (`@electric-sql/pglite`). Data lives in
`$AFTERLIFE_DATA_DIR/index` (default `.afterlife/index`, or `.belay/index` when only `.belay/` exists; gitignored); tests use `memoryIndex()`. Delete the folder and every
table is rebuilt from the source in the last column, except the three marked **not rebuildable** (Afterlife's own records).

| Table | Holds | Rebuilt from |
|---|---|---|
| `fleet_group`, `project`, `project_stage` | groups, projects, nine rungs per project | GitLab group/project API, the default branch's .gitlab-ci.yml arm markers + maturity scan |
| `trust_class`, `class_tier` | classes; per project and class the tier recorded in tier-state.yml, capped by the policy, its lease, record and last move (`no_record` when no agent holds the class, `refused` when several do, with each holder's tier: read by `views/standing.ts`) | `belay-policy` trust-policy.yml, tier-state.yml + ledger |
| `ledger_event` | hash chain, unique `(project_id, seq)`, append-only trigger | `belay-ledger/events/<id>.jsonl` (delete the folder, the poller re-imports; no code disables the trigger) |
| `cycle_record` | closed improvement cycles per project (the index's project id; each record keeps the GitLab id it names), hash-chained | `belay-ledger/cycles/<id>.jsonl` |
| `task`, `proof` | tasks and Proof Blocks | MR notes (`belay-proof`, `Belay-Task:` trailer) + ledger |
| `proposal` | Needs-you inbox; gap picks are children of one `gap` item | GitLab state, CRA clocks, maturity scan |
| `stage_cell` | every maturity scan, latest read | repository scan (`engine_version` pinned) |
| `pairing`, `setup_step` | where Afterlife is paired, what each step measured | `afterlife doctor` probes |
| `poll_state` | last good poll and last error per source (`project:<id>`, `group:<group>`, and `policy:<group>` for belay-policy's files) | the poller |
| `commands_run` | every write the operator confirmed, recorded before it runs | **not rebuildable**: Afterlife's own audit |
| `action_runs` | per previewId a live confirm claimed: running, done, failed or cut, with the response sent (`server/actions/runs/journal.ts`) | **not rebuildable**: lost, a confirm with no answer recalls as never run |
| `fleet_day` | one row per project per UTC day, written after the day's first poll from the numbers the Fleet showed (needs, stale, hands-off, proofs, red rate, cost; `server/data/live/day.ts`), append-only trigger | **not rebuildable**: Afterlife's own record, lost, the week-over-week trend starts again |

Project columns `proofs_*_7d`, `demotions_7d`, `needs_you`, `cra_open` are roll-ups the poller recomputes from the
tables above. NULL means unknown, never zero.

## Layout

- `db.ts` open, shared instance (`getIndex`, retried after a failed open), `closeIndex`. `migrations/` versioned SQL as TS
  modules: `steps/` holds 0001-0010 and is at the structure gate's 10-file folder ceiling, `later/` holds 0011 onward
  (`migrate.ts` lists both). `migrate()` is idempotent and checksum-guarded: an applied migration is keyed by the sha256
  of its sql, so none is ever edited (`__tests__/migrations.test.ts` pins all of them, and `migrations/parts.ts` writes
  its stage, tier and ceiling lists out instead of reading `src/schemas`). A test of one migration runs `migrate()`
  through its own prefix, `migrate(db, MIGRATIONS.filter((m) => m.version <= N))`, never the whole list: asserting that
  `migrate(db)` applies exactly `[9]` broke when 0010 arrived, and updating every older test per new migration ties each
  test to every later one (c4fd9d2). `repositories/` typed, parameterised functions per table (no ORM).
- `views/` return the shapes in `src/lib/demo` (`getFleet`, `getNeedsYou` and its badge `getNeedsYouCount`, `getDecided`,
  `getActionClasses`, `getMaturity`, `getTasks` and one task's `getTask`, `getLastTaskEvent` for the Fleet row's last
  event, and `getEvents`: the deep project's recent events, dated only by what the index holds with a time;
  `cycles/` `getCycles` and `getEstateCycles`, the closed cycles of `cycle_record` counted in days from the first;
  `stability/` `getStability`, each polled project's agent MRs started in the last 7 days, folded from the `size` and
  `pipeline` the poller stores on the task detail). Countdowns and ages are computed from stored instants with a `now` argument. Where the index cannot
  know a value the field is `null` (types widened in `views/types.ts`).
- `seed/` loads `belay-demo.json` anchored at `SEED_NOW` (14:22 UTC) so tests can prove the views match the demo.

## Migrations

| Version | Adds |
|---|---|
| 0001 `fleet` | `fleet_group`, `trust_class`, `project`, `project_stage`, `class_tier` |
| 0002 `work` | `task`, `proof`, `proposal`, `stage_cell` |
| 0003 `ledger` | `ledger_event` and its append-only trigger |
| 0004 `operator` | `pairing`, `setup_step`, `poll_state`, `commands_run` |
| 0005 | `class_tier.move_kind` admits `no_record` and `refused` |
| 0006 | each record counter stands on its own (the all-or-none check is dropped) |
| 0007 | `class_tier.guardrail_blocks`, `count_window` |
| 0008 | `ledger_event.verdict` |
| 0009 | `class_tier.cooldown_until` (`__tests__/migration9.test.ts` migrates a populated version-8 index) |
| 0010 | `ledger_event.environment` |
| 0011 | `ledger_event.state_rev`, `withdrew`; `class_tier.receipt` |
| 0012 | `class_tier.gated`, `gate_iid`, `gate_tier`, `gate_at` |
| 0013 | `class_tier.sources` |
| 0014 | `ledger_event.would`; `class_tier.trial` |
| 0015 | index `stage_cell (project_id, scanned_at)`: the latest-scan reads stop walking a project's history |
| 0016 `action_runs` | `action_runs`: the run journal, one row per previewId a live confirm claimed (`server/actions/runs/journal.ts`) |
| 0017 `cycles` | `cycle_record`: a project's closed improvement cycles, a cache of belay-ledger/cycles/<gitlab-id>.jsonl (`server/ledger/importCycles.ts`) |
| 0018 `project_live` | `project.armed` nullable with no default (null: not read, never zero armed), `project.web_url`: the project's GitLab page (`server/poller/ci/armed.ts`, `server/poller/project.ts`) |
| 0019 `fleet_day` | `fleet_day`: one row per project per UTC day, append-only (update and delete raise, as `ledger_event`); the trend's history (`repositories/fleet/day.ts`, `src/lib/trend`) |

## Ledger

`appendLedgerEvents(db, events)` checks seq, `prev_hash` and a recomputed hash (`src/schemas/ledger.ts`) in one
transaction; a bad chain throws `LedgerChainError` and writes nothing. Re-importing stored events is a no-op; a
different event at a stored seq is rejected as a fork. `verifyStoredChain` re-verifies from genesis. Migration 0008 adds
`verdict` (the guardrail's `pass` or `block`, on a `guardrail_verdict` only); a null reads back as no `verdict` key, so an
event without one hashes as it always did (`../ledger/README.md`). Migration 0010 adds `environment` (jsonb `{ name, tier }`,
on a `deployed` event only, tier one of GitLab's five), 0011 `state_rev` and `withdrew` and 0014 `would` (a `tier_decision` only);
a null reads back as no key, the same way.

## Not yet served
Tracks, loop, setup phases and cockpit have no view yet. `pairing` is read by the live snapshot and written by each poll
cycle (`server/data/live/snapshot.ts`, `server/poller/cycle.ts`); `setup_step` has its repository only, and no code
outside the tests calls it. Times are
formatted in UTC.

## Decision: the standing key `refused`
The stored standing key `refused` stays (no migration renames it; 0005 admitted it). Every screen shows it as Split, per holder
(`views/standing.ts:31-33`). A rename is backlog.

## Added by B6
`setProjectState` (the poller marks a failed feed `stale`), `deleteProofs` (a proof for an older head is removed), and `openIndex`
now creates the data folder and its parents (PGlite only made the last one, so a first start with no data folder failed).
