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
   Missing or malformed (or no belay-policy project): class tiers are left as they were, and `recordPollError` on the
   `policy:<group>` source (`policySource`) says why; Ladder marks the class tiers stale with that reason until a read
   succeeds (`recordPollOk` on the same source). The group's own poll is still recorded ok.
4. Index plumbing: groups (existing order kept), trust classes (existing order kept, new ones appended), the pairing row.
5. Per target project (`project.ts`), reads first, one transaction of writes after, so a failed read writes nothing:
   - MRs updated in the last 7 days (`state=all`): the proof roll-up counts `proof::*` labels (`updated_at` stands in for the proof time);
   - MRs updated in the last 24 h (`BELAY_TASK_HOURS`) are read as tasks: description trailers, notes (cached by `updated_at`),
     deployments (for "merged · in production");
   - `importLedger` (see `../ledger`); a rejected ledger still lets the rest land, then fails the feed;
   - writes: project row, tasks, proofs, then (`classes.ts`, after the tasks so this poll's merges count) `class_tier`
     (tier, since, set_by, lease, move, and the counted record of a class one agent holds), re-admit and promotion asks, roll-ups (`proofs_*_7d`, `demotions_7d`, `needs_you`,
     `cra_open`).
6. `poll_state`: `recordPollOk` at `now`, or `recordPollError` (keeps `last_ok`); a failed project is also set `stale`.

## Whom it believes (`config.ts`)

| Source | Counts only from | Default |
|---|---|---|
| MR description (`Belay-Task`, `Belay-Class`, claims prose) | agent accounts | prefix `ai-` (`BELAY_AGENT_PREFIX`) |
| `belay-proof` block in a note | proof accounts. The patcher is **not** one | prefix `ai-proof-`, plus `BELAY_PROOF_AUTHORS` |
| `belay-guardrail` block | guardrail accounts, and only for the MR's current head | prefix `ai-guardrail-`, plus `BELAY_GUARDRAIL_AUTHORS` |

Where it reads from: F49 (e2079f8) reads belay-policy and belay-ledger at `<group>/<name>` by full path and polls only projects under the group's own path (`cycle.ts:73-79`). F51 (8a534c8) reads a tier record whose `by` is not text as the gate does, by its tier alone (`derive/tiers.ts`), so a hand-written `{ tier: quarantined }` no longer aborts the poll.

Everything else on the page is text. A proof block must also have every field typed, and a verdict that follows from its
own checks (the gate's rule). A block's `task.head_sha` (new, optional) is compared with the MR head: a proof for an older
head is **stale**: not indexed, any earlier proof of the task is deleted, and the task says "proof stale · the head moved".
`[R?]` the exact usernames of the flow and bot accounts are unverified (spike S1).

## What it owns, and what it does not

| Derived from GitLab (tested against the demo GitLab) | Not derived (seed-only, or unknown) |
|---|---|
| tasks and proofs from MRs; state label from labels, MR state and deployments | `class_tier.record` of a class no agent or several agents hold: kept as it is, else null |
| record counters of a class one agent holds (see "Record counters"), stored on its `class_tier` row each on its own (migration 0006: null is a counter nothing states, never 0; a row with every counter null reads as no record) and read by its promotion ask |
| promotion ask for a class whose counters meet the rule Ladder's Promote reads (`promotion()` in `src/lib/promotion`), `promote:<project>:<class>`, closed when it stops being eligible |
| class tiers: recorded in tier-state.yml, capped by the policy, by the gate's own rule (`engine/decide/standing.ts`: holder, lower of record and ceiling, lapsed lease = supervised). Group-wide, never from proof history. No record: stored quarantined with move `no_record` (the gate blocks it); several holders, named for the role or not: stored at the most restrictive holder with move `refused`, its note listing every holder at the tier the gate grants a merge request that holder authored (CI passes the author as `--agent`) | CRA sign-off asks (the port has no work-item reads); gap picks and setup steps (scans and probes) |
| moves "promoted" and "tripwire" (with its trigger as the note) from the record's `by` | project `last`, `env_*`, `armed`, stage rungs, `what` |
| re-admit ask for a class the tripwire quarantined (deduplicated by kind and title, so a seeded one is respected) | track `armed`/`latest`, the event feed, cockpit text |
| 7-day proof counts, demotion count, inbox counts, feed age | task `chain`, `countsToward`, `stats`, `clock`, `grade` |

A project indexed earlier from another namespace stays shown and counted, and only stops being polled: it is marked stale
(`cycle.ts:90-93`), and the fleet view still lists it (`src/server/index/views/fleet.ts:20-58`). F57's "gone" state is
proposed and is not M1 work.

## Record counters (`derive/counters.ts`)

Counted for a class one agent holds, from its tier-state.yml record's `since`, over the project's indexed tasks and its
imported ledger, and stored on its `class_tier` row every poll (`derive/tiers.ts`), replacing what the row held (the seed's,
on the demo GitLab). A counter comes only from what a row or an event states; one nothing states is null, and Ladder's rule
reads it "not recorded", never met. Mapped to trust-policy.yml's `promotion` block as `rulesOf` (`data/policy.ts`) reads it:

| Counter | Source | Policy key |
|---|---|---|
| accepted | distinct merge requests the holder merged in the class since `since`: ledger `merged` events (`agent`, `action_class`, `at`, `subject.iid`) and task rows (`agent`, `action_class`, state `merged`, `finishedAt`), minus any a task row states `reverted`. In the window, when there is one | `assisted_to_supervised.accepted`, `supervised_to_hands_off.accepted` |
| reverts | task rows in state `reverted` since `since` (in the window, when there is one). Established only when the policy demotes on `revert` (the tripwire then rewrites the record, so `since` post-dates any revert it saw); else null | `assisted_to_supervised.reverts` |
| cleanDays | whole days since `since`, only when reverts is established and 0; else null | `supervised_to_hands_off.clean_days` |
| noEdit | merged outputs in the counts with no edit, over the merged outputs in the counts. "Merged without edits": before the MR merged, no commit reached it from anyone but the agent that opened it. The task row states it (`detail.edited`, `derive/task.ts:101`) for a merged MR whose notes this poll read: edited when a push note by another account precedes the merge (`parse/pushes.ts`; GitLab writes a system note "added N commit(s)" for each push to the source branch, authored by the pusher `[R?]`, from GitLab's docs and source, not a run). The recogniser fails closed: another account's system note before the merge that mentions a commit or a push in any other shape (a cross-reference "mentioned in commit ..." aside) states no fact, so a rewording reads "not recorded", never unedited. Null when any counted merged output has no stated fact (a merge known only from a ledger `merged` event, a row indexed before the fact was read, or an unrecognised push-related note), and when there is no merged output. A person's rebase and a reviewer's applied suggestion are pushes by that person, so edits; the agent's own pushes, force pushes included, are not | `supervised_to_hands_off.no_edit_ratio` |
| needed | not in the policy: null | - |
| guardrailBlocks (`guardrail_blocks` column, migration 0007) | merge requests in the counts with a stated guardrail block: a `guardrail_verdict` event with `verdict: 'block'`, or a task row in state `blocked` with the label `blocked` (which `derive/task.ts` `stateOf` sets only from `guardrail::block`). A merge request blocked on any head counts, even if a later head passed. 0 only when this poll read the ledger (imported or unchanged) and every `guardrail_verdict` event in the counts states `pass` (or there is none): the gate emits one, stating the verdict, with every guardrail verdict (`gitlab/components/scripts/decide/apply-gate.mjs:56`). An event written before the ledger stated the verdict, which no task row resolves as a block, leaves it null | `assisted_to_supervised.guardrail_blocks` |
| window (`count_window` column, migration 0007) | for an assisted class only: trust-policy.yml's `window_last`. The counts above are then taken over the holder's last that many outputs since `since`: merge requests with a stated outcome (merged, reverted, closed, guardrail- or proof-blocked) by the latest time stated for each; one still in flight is not an output. Null: counted since `since` | `assisted_to_supervised.window_last` |

`human_key` (`supervised_to_hands_off`) is met by construction, never counted: Belay's only write that raises a tier is the
promotion's policy MR, which `planPromote` opens and never merges (`src/server/actions/plans/promote.ts:43-49`), so a
person always merges the promotion (cited in `src/lib/promotion/rules.ts`). Live, the poller never writes a task
`reverted` (it reads no revert MR), so reverts rests on the tripwire. A stated guardrail block is a lower bound when other
verdicts are unresolved: enough to read the rule unmet, never met.

A promotion ask (`derive/promotion.ts`) carries `from`, `to` and each rule with its count; one a person acted on or
dismissed at or after the record's `since` is not opened again until the record moves (re-admits likewise).

A task id belongs to the first project and MR that used it: a second MR claiming it is ignored and reported.
Pipelines are not read: no row consumes them yet.

## Known limits (decided, not built)

1. **Reverts and clean days are stated only when trust-policy.yml demotes on a revert.** Only then does the tripwire
   rewrite the record's `since` on a revert, so "no revert since `since`" is a fact (`derive/counters.ts:21-25`,
   `revertDemotes`; applied at `derive/counters.ts:121`). Under a policy that does not demote on `revert`, reverts and
   clean days read "not recorded", and no class is promoted to Supervised or Hands-off from a poll.
2. **A promotion MR closed without merging does not ask again until the record's `since` moves.** A person acting on the
   ask (opening the MR) settles it, and an ask settled at or after the record's `since` is not reopened
   (`derive/promotion.ts:83`, `isSettled` at `derive/promotion.ts:91`). Closing the MR unmerged leaves tier-state.yml,
   and so `since`, unchanged: the class stays eligible on Ladder, but Needs you does not ask again until the record moves.
3. **Asks are per project while tier-state.yml is group-wide.** tier-state.yml is read once per group
   (`cycle.ts:83`), but the record is counted and the ask opened per target project (`project.ts:151`,
   `classes.ts:29-52`, id `promote:<project>:<class>` from `src/lib/promotion/promotion.ts:39`): a class whose holder works
   in two projects is counted, and asked about, once in each. Kept because the demo group holds one delivery project.
4. **No-edit is stated only for a merge the poll read as a task.** The poll reads an MR's notes only while it is in the
   task window (`BELAY_TASK_HOURS`, 24 h by default), so a merge first seen later, or one known only from the ledger,
   has no edited fact and the ratio reads "not recorded" until it leaves the counts. Tasks indexed before the fact was
   read carry none either. The push note's shape is `[R?]` (docs, not a run): if GitLab words a push differently and the
   note still mentions a commit or a push, the merge has no stated fact and the ratio reads "not recorded" (fails
   closed); a rewording that mentions neither would still be missed, so a recorded run is owed before no-edit is
   trusted on a real group (every push note in the tests is synthetic). A force push that only drops commits writes no
   note, so another account's force push that only removes commits is not seen as an edit. Commits on the branch before
   the MR opened write no note either. Notes are read up to the adapter's page cap (50 pages of 100).
