# tripwire

Demotes an agent when something it merged goes wrong, and commits the new `tier-state.yml` to `belay-policy`. It only ever
lowers a tier: promotion is a person's merge request. This runs in GitLab, so a closed laptop still demotes.

**Job:** `belay-tripwire`. **Stage:** `.post`. **Runs:** `when: always` on default-branch push pipelines (event mode: a revert
and this pipeline's own proof) and on a schedule with `BELAY_TRIPWIRE=sweep` (sweep mode: everything else). Never on an MR
pipeline.

## Include and schedule

```yaml
include:
  - component: $CI_SERVER_FQDN/acme/belay-pack/tripwire@1.0.0
    inputs:
      engine_ref: v0.1.0
      engine_commit: '<40-char sha of that tag>'
```

Create a pipeline schedule on the default branch (every 10 minutes is enough) with the variable `BELAY_TRIPWIRE=sweep`. The
schedule owner should be a person, or the trigger rules around flows may not apply; the tripwire itself is a plain job.

## What it detects

Each event is `{trigger, agent, class, at, evidence}` (engine/decide/tripwire.ts). Agent and class come from the MR author and
its `Belay-Class:` trailer.

| trigger | How it is found |
|---|---|
| `revert` | a `Revert "..."` commit whose body says `This reverts commit <sha>`, mapped to an agent MR through the commits API |
| `post_merge_proof_fail` | a failed job whose name starts `belay-proof`: in event mode, in this push pipeline (still running); in a sweep, in the finished default-branch pipelines of the lookback, the newest run of each commit, never the job's own pipeline or a schedule's |
| `default_branch_red_1h` | the newest finished default-branch pipeline (not the job's own, not a schedule's) failed, with no failed proof, and was last updated at least an hour ago |
| `reopened_finding` | a merged agent MR with a `Belay-Finding: <id>` trailer whose vulnerability is DETECTED or CONFIRMED again (GraphQL) |
| `guardrail_high` | the newest trusted `belay-guardrail` block on an agent MR has verdict block and a high finding |

### Seeing a failed proof (`scripts/lib/pipelines.mjs`)

Two things hid a failed post-merge proof. The job sits in `.post`, and a job's default `when: on_success` skips it as soon as
an earlier job failed: exactly when `belay-proof-<class>` failed. And a sweep read the newest default-branch pipeline,
which is its own schedule pipeline, still running, so never `failed`. The fix is both halves:

- **`when: always`** on the job's two rules. Chosen over relying on the sweep alone because the push pipeline is where
  the failure happens: the demotion lands minutes after the merge, not at the next schedule, and without a schedule at
  all. It changes nothing about who gets a token: the rules still match only default-branch pushes and the sweep
  schedule, never an MR pipeline, the job is the same job, and no other job gains `BELAY_BOT_TOKEN` (F4). In event mode
  the pipeline is still running when this job runs, so it reads this pipeline's failed proof jobs (`CI_PIPELINE_ID`)
  rather than a pipeline status.
- **Detection skips the current pipeline id** and every schedule pipeline (a sweep's holds no proof) and reads finished
  pipelines only, so a sweep still sees the failed push pipeline before its own. It also catches a push pipeline whose
  tripwire job did not finish.

The event is named by the failed proof job's `finished_at` and the pipeline's address, so event mode and a later sweep
name it the same way and the sweep skips it. One failed proof is one demotion: a pipeline with a failed proof never
also counts as `default_branch_red_1h`. A proof that failed and then passed on a retry of the same commit is no failure
(the newest run of a commit is its verdict).

For each new event it runs `engine tripwire`, takes the `commit` it returns (only `tier-state.yml` is accepted), and writes one
commit with `Belay-Event: <key>` lines. The next run skips every key already in the last 300 commits of `belay-policy`, so a
sweep is idempotent. An event the engine rejects (for example, the agent holds no such class) is listed and the job exits 2
after committing the others.

The commit never lands over a newer `tier-state.yml` (an operator's revoke from Belay, another tripwire). Before writing,
the job reads the file and its `last_commit_id` through the API (with the write token): if its content is no longer the
clone's, which every decision was computed from, nothing is written. Otherwise the commit's update action carries that
`last_commit_id` (commits API: "Last known file commit ID. Only considered in update, move, and delete actions." [R]), so
GitLab refuses it (400) if the file moves in between. Either way the job exits 3 with nothing committed, and the next run
starts from the new file; the events are not recorded, so they are not lost.

## Needs

- `BELAY_BOT_TOKEN` (reads the target) and `BELAY_POLICY_TOKEN` (writes `belay-policy`), both **protected** variables so only the
  default branch and the schedule can use them. An MR branch must never see them.
- The bot is "Allowed to push and merge" on `belay-policy`'s protected `main` (spike S8). Direct pushes by such an account skip
  code-owner approval ([S] docs.gitlab.com/user/project/codeowners/). If that is refused, set `write_mode: mr`.

## Inputs

| Input | Type | Default | Meaning |
|---|---|---|---|
| `stage` | string | `".post"` |  |
| `engine_ref` | string | **required** | Tag, branch or full SHA of the Belay engine to run. Required, so the checker is always pinned. |
| `engine_commit` | string | `""` | Optional 40-char SHA the checkout must resolve to. Set it when engine_ref is a tag or branch. |
| `engine_project` | string | `"$CI_PROJECT_ROOT_NAMESPACE/belay-engine"` | Project path holding the Belay repo (engine/, src/schemas, gitlab/). Must allowlist this project's job token. |
| `policy_project` | string | `"$CI_PROJECT_ROOT_NAMESPACE/belay-policy"` |  |
| `policy_ref` | string | `"main"` |  |
| `node_image` | string | `"node:22-bookworm"` |  |
| `glab_version` | string | `"1.120.0"` |  |
| `glab_sha256` | string | `""` |  |
| `runner_tags` | array | `[]` |  |
| `guardrail_authors` | string | `"ai-guardrail-$CI_PROJECT_ROOT_NAMESPACE"` | Usernames whose guardrail notes count (a high-severity block demotes the agent). |
| `agent_prefix` | string | `"ai-"` |  |
| `lookback_hours` | number | `24` | How far back a sweep looks. Events already recorded in belay-policy history are skipped. |
| `write_mode` | string | `"commit"` | commit pushes tier-state.yml to the policy branch (the bot must be allowed to push, spike S8). mr opens a merge request instead. One of `commit`, `mr`. |
| `policy_branch` | string | `"main"` |  |
| `write_token_var` | string | `"BELAY_POLICY_TOKEN"` | Name of the CI variable (protected, masked) holding a token that may write belay-policy. |

## Verify

- `[R]` commits-by-sha merge requests endpoint, pipelines and jobs list parameters (and `source` in a pipeline row; without
  it a schedule pipeline is still skipped by id or by holding no proof job); `[R?]` the GraphQL `vulnerability(id)` query
  and `state` values used for `reopened_finding`.
- `budget_breach_x2` (the one trigger in policy this does not detect) needs a model-spend counter that GitLab does not give a job.
