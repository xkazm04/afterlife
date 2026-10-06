# src/server/poller - GitLab -> index (module B6)

`runPollCycle(port, db, now, {cfg?, mem?})` is one poll of the group. `now` is an argument: a test, or the fake group's
replay clock, decides what time it is. `startScheduler(tick, intervalMs)` repeats a cycle (one at a time, never overlapping);
`BELAY_POLL_SECONDS` sets the interval (default 30, never below 5). The only caller is `data/live/runtime.ts`, on server boot.
Tests never start a timer.

## One cycle

1. `getGroup` + `listProjects`. If either fails: every project already polled gets a `project:<id>` error (it keeps its last
   good time, so its age grows and it shows stale) and the cycle stops.
2. Targets are the group's non-archived projects except `belay-policy`, `belay-ledger`, `belay-pack`, `belay-engine`.
   A project polled before that is gone from the group goes stale.
3. `belay-policy`: `trust-policy.yml` + `tier-state.yml`, parsed with the engine's own `parsePolicy`/`parseState`.
   Missing or malformed: a warning, and class tiers are left as they were.
4. Index plumbing: groups (existing order kept), trust classes (existing order kept, new ones appended), the pairing row.
5. Per target project (`project.ts`), reads first, one transaction of writes after, so a failed read writes nothing:
   - MRs updated in the last 7 days (`state=all`): the proof roll-up counts `proof::*` labels (`updated_at` stands in for the proof time);
   - MRs updated in the last 24 h (`BELAY_TASK_HOURS`) are read as tasks: description trailers, notes (cached by `updated_at`),
     deployments (for "merged · in production");
   - `importLedger` (see `../ledger`); a rejected ledger still lets the rest land, then fails the feed;
   - writes: project row, `class_tier` (tier, since, set_by, lease, move), tasks, proofs, re-admit asks, roll-ups
     (`proofs_*_7d`, `demotions_7d`, `needs_you`, `cra_open`).
6. `poll_state`: `recordPollOk` at `now`, or `recordPollError` (keeps `last_ok`); a failed project is also set `stale`.

## Whom it believes (`config.ts`)

| Source | Counts only from | Default |
|---|---|---|
| MR description (`Belay-Task`, `Belay-Class`, claims prose) | agent accounts | prefix `ai-` (`BELAY_AGENT_PREFIX`) |
| `belay-proof` block in a note | proof accounts. The patcher is **not** one | prefix `ai-proof-`, plus `BELAY_PROOF_AUTHORS` |
| `belay-guardrail` block | guardrail accounts, and only for the MR's current head | prefix `ai-guardrail-`, plus `BELAY_GUARDRAIL_AUTHORS` |

Everything else on the page is text. A proof block must also have every field typed, and a verdict that follows from its
own checks (the gate's rule). A block's `task.head_sha` (new, optional) is compared with the MR head: a proof for an older
head is **stale**: not indexed, any earlier proof of the task is deleted, and the task says "proof stale · the head moved".
`[R?]` the exact usernames of the flow and bot accounts are unverified (spike S1).

## What it owns, and what it does not

| Derived from GitLab (tested against the demo GitLab) | Not derived (seed-only, or unknown) |
|---|---|
| tasks and proofs from MRs; state label from labels, MR state and deployments | `class_tier.record`: accepted / needed / no-edit / clean days / reverts (no GitLab signal for "merged without edits"; `needed` is not in the policy). Kept as it is, else null |
| class tiers from policy + tier-state (effective tier = lower of record and ceiling; lapsed lease = supervised; no record = quarantined) | promotion asks (they need the record); CRA sign-off asks (the port has no work-item reads); gap picks and setup steps (scans and probes) |
| moves "promoted" and "tripwire" from the record's `by` | project `last`, `env_*`, `armed`, stage rungs, `what` |
| re-admit ask for a class the tripwire quarantined (deduplicated by kind and title, so a seeded one is respected) | track `armed`/`latest`, the event feed, cockpit text |
| 7-day proof counts, demotion count, inbox counts, feed age | task `chain`, `countsToward`, `stats`, `clock`, `grade` |

A task id belongs to the first project and MR that used it: a second MR claiming it is ignored and reported.
Pipelines are not read: no row consumes them yet.
