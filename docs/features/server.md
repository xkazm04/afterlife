# Server (`src/server`)

> Where does every screen's data come from, how does GitLab get into it, and how does a write reach GitLab?

## What it does
- `data/`: one `DataSource` interface every route loader reads (`getFleet`, `getTracks`, `getSetup`, `getTasks`, ...
  plus `mode` and `deepProjectId()`), served either by the demo fixture (`demo`) or by a snapshot of the local index
  (`live`).
- `gitlab/`: a typed `GitLabPort` for reads and planned writes, implemented by a real adapter over `glab api` and by
  an in-memory fake GitLab; also the `belay doctor` capability probes.
- `index/`: a local cache of GitLab plus the ledger in embedded Postgres (PGlite), with versioned migrations, typed
  repositories and views that return the screens' shapes.
- `poller/`: one poll cycle reads the group from GitLab and writes the index; a scheduler repeats it.
- `ledger/`: imports `belay-ledger/events/<project-id>.jsonl` into the index after verifying the hash chain.
- `actions/`: operator writes as two Next server actions, preview then confirm.

## How it works
- **Selection** (`data/select.ts`, `config.ts`): `getDataSource()` reads the environment on every call.
  `BELAY_MODE=live` is live; anything else is demo. `BELAY_GITLAB=fake` uses the fake group instead of the operator's
  glab login. `BELAY_PROJECT` names the deep project (default ledgerline). `app/layout.tsx` is `force-dynamic` so
  nothing is prerendered with the build's environment.
- **Live runtime** (`data/live/runtime.ts`, `boot.ts`, `src/instrumentation.ts`): on server start in live mode,
  `register()` creates one port, one index, one poller and one snapshot per process, kept on `globalThis`. `refresh()`
  runs `runPollCycle`, then `buildSnapshot`; concurrent callers share the cycle in flight. Pages read the snapshot
  synchronously.
- **Snapshot** (`data/live/snapshot.ts`): fleet, action classes, maturity, tasks and needs-you from index views; group
  name from the pairing row; cockpit and setup from the demo catalogue with only `feed.lastPollSec`, group and project
  made live. `narrow.ts` maps unknowns to the most restrictive reading: unknown tier -> quarantined, task with unknown
  class -> not listed, maturity never scanned -> nine null rungs.
- **Clocks** (`data/live/clock.ts`): real GitLab uses the system clock; the fake group uses a replay clock (polled
  14:21:48, read 14:22:00, always) so ages and countdowns match the demo moment.
- **GitLab port** (`gitlab/port.ts`): reads for user, instance, group, namespace, projects, pipelines, jobs, trace,
  test summary, MRs, notes, diffs, environments, deployments, releases, schedules, files, tree, vulnerabilities, an
  untyped `get` for probes, and `execute(planned)`. `plan/builders.ts` has seven pure write builders (`createMr`,
  `addNote`, `setLabels`, `setIssueLabels`, `commitFile`, `pauseSchedule`, `approveDeployment`) that return
  `{argv, display, risk}` with risk `low`, `policy` or `merge`.
- **glab adapter** (`gitlab/adapter/`): `glab api` through `execFile` (no shell), pagination, 429 backoff, typed
  `GitLabError`. No token is read or stored; glab's keyring is the login.
- **Fake GitLab** (`gitlab/fake/`): the same adapter over an in-memory `glab api` server; `execute` changes its state.
  `fake/demo/` builds group `acme-lab` from the demo dataset (ledgerline's MRs, notes, labels, deployments, policy
  files and a verifying ledger).
- **Doctor** (`gitlab/capabilities.ts`): eleven capabilities, each available / unavailable / unknown with a basis
  (`endpoint`, `plan`, `version`, `none`) and a reason. 403/404 is unavailable; network, auth or rate-limit failure is
  unknown; a capability with no safe read is decided by plan or stays unknown.
- **Index** (`index/`): `openIndex` / `getIndex` open PGlite under `$BELAY_DATA_DIR/index` (default `.belay/index`);
  `migrate()` applies `0001_fleet` (groups, classes, projects, stages, class tiers), `0002_work` (tasks, proofs,
  proposals, stage cells), `0003_ledger` (`ledger_event` with a no-change trigger), `0004_operator` (pairing, setup
  steps, poll state, `commands_run`), each in a transaction, checksum-guarded, and refuses an index migrated by a
  newer version. `repositories/` are parameterised SQL per table; `views/` return the `src/lib/demo` shapes with a
  `now` argument; `seed/` loads the demo anchored at `SEED_NOW`.
- **Poller** (`poller/cycle.ts`, `project.ts`): group and projects; skip `belay-policy`, `belay-ledger`, `belay-pack`,
  `belay-engine`; read `trust-policy.yml` and `tier-state.yml` with the engine's own parsers; per project, read MRs (7
  days for proof roll-ups, 24 h for tasks), notes, deployments and the ledger, then write in one transaction; record
  `poll_state`. `startScheduler` repeats it every `BELAY_POLL_SECONDS` (default 30, minimum 5), never overlapping.
- **Ledger import** (`ledger/importLedger.ts`): list `events/`, skip if the blob id is unchanged, parse each line,
  verify the whole file from genesis, then append from the stored tail in one transaction.
- **Actions** (`actions/`): `previewAction(intent)` validates and plans; `confirmAction(intent, previewId)` plans
  again and runs only if the sha-256 digest of the commands still matches. Intents: `revoke-class`, `promote-class`,
  `mark-cra-ready`, `stage-gap-mr`.

## Rules it keeps
- Writes only on a click, as the operator's own glab login, with the exact command shown first. If GitLab moved
  between preview and confirm, nothing runs and `changed` returns the new preview.
- Live: each command is written to `commands_run` before it runs and finished with its exit; a failure stops the rest;
  a poll follows either way. Demo: planned against the fake group, never executed, no record, every result
  `simulated: true`.
- Revoke only lowers a tier and may push `tier-state.yml` to the default branch; raising is a promotion MR on a new
  branch labelled `belay::promotion` that a person merges. Belay never merges. `mark-cra-ready` never submits.
- Unknown is never zero: NULL in the index means unknown; views keep it `null`; the live source throws before its
  first poll rather than show an empty fleet as real; the doctor never guesses.
- Who counts: MR description fields only from agent accounts (`ai-`), `belay-proof` blocks only from proof accounts
  (`ai-proof-`; the patcher is not one), guardrail blocks only from guardrail accounts and only for the current head.
  A proof for an older head is stale and not indexed.
- The ledger is append-only (trigger) and verified: a bad chain, fork, rewind or foreign event throws
  `LedgerChainError`, writes nothing, and the poller fails that project's feed while the rest lands.
- Every index table but `commands_run` can be rebuilt from GitLab.

## Code map
| Path | Role |
|---|---|
| `src/server/data/` | `DataSource` types, `select.ts`, `demoSource.ts`, `config.ts`, `boot.ts`, `live/` (runtime, snapshot, narrow, clock, ports, liveSource) |
| `src/server/gitlab/` | `port.ts`, `types.ts`, `plan/`, `adapter/`, `fake/`, `capabilities.ts`, `doctorCli.ts`, `config.ts`, `errors.ts` |
| `src/server/index/` | `db.ts`, `migrations/`, `repositories/`, `views/`, `seed/` |
| `src/server/poller/` | `cycle.ts`, `project.ts`, `scheduler.ts`, `config.ts`, `derive/` (policy, tiers, task, readmit, rollup), `parse/` (proof block, guardrail, trailers, labels) |
| `src/server/ledger/` | `parse.ts`, `importLedger.ts` |
| `src/server/actions/` | `actions.ts` (`'use server'`), `run.ts`, `intents.ts`, `plans/`, `deps.ts`, `types.ts` |
| `src/instrumentation.ts` | Starts the live runtime on Node |

## Tests
- `data/__tests__/source.test.ts`: env defaults, demo source equals the demo accessors, live throws before the first
  poll, empty index and narrowing. `parity.test.ts`: every loader (fleet, needs-you, tasks, ladder, maturity, setup,
  theater) gives the same props in demo mode and in live mode over the fake group.
- `gitlab/__tests__/`: client pagination and backoff, adapter contract against recorded live fixtures, fake reads and
  writes, exact argv of every planned write, capability classification, config.
- `index/__tests__/`: migrations (idempotent, checksum, unknown version), repositories, poll state, ledger chain and
  fork rejection, seeded views matching the demo, opening a fresh data folder.
- `poller/__tests__/`: one cycle, task and proof derivation with author rules and stale heads, block parsing,
  scheduler non-overlap.
- `ledger/__tests__/ledger.test.ts`: full and incremental import, blob-id skip, edited event, fork, rewind, foreign
  project, parser.
- `actions/__tests__/`: preview writes nothing, confirm records before and after and polls, stale or made-up preview
  ids run nothing, refusals, promotion via branch and MR, CRA ready, gap MR order, failure stops the rest, demo
  results simulated.

## Status and limits
- Demo mode is the default and what the app shows. Live mode against a real group is wired but the real group was
  empty when recorded (2026-10-06); most read shapes come from documentation fixtures, not recordings.
- In live mode tracks, loop, event feed, cockpit text, setup phases and doctor rows, tier meanings and stage list are
  still the demo catalogue.
- No UI button calls `previewAction` / `confirmAction` yet. Not verified live: every write, the diffs endpoint,
  `start_branch`, issue label PUT for work items, the Flows API route. The fake does not model branches, issues or
  protections.
- Pipelines are not read by the poller. Exact flow and bot account usernames are unverified. Times are formatted in
  UTC.
