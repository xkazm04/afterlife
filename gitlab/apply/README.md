# belay-apply: the one project that writes

This folder is the root of the `belay-apply` project in the paired group. It holds every Belay write token and makes every
Belay write: the `belay-proof` note and `proof::*` label, the gate's note, labels, approve and auto-merge, the
`belay-ledger` lines, the guardrail's dispatch and the tripwire's `tier-state.yml` commit. No write token enters a target
pipeline. Target pipelines (`../examples/target-project/.gitlab-ci.yml`) produce evidence and report-only output with
`CI_JOB_TOKEN`, and nothing else.

Decided by the operator on 2026-10-07 (ask 6696d24d, "Separate apply project") as the remedy for F4 (High). F4: once set,
`BELAY_BOT_TOKEN` could be read by every job of an agent MR pipeline, including the agent's own tests and any
`.gitlab-ci.yml` the agent edits on its branch.

```
belay-apply/
  .gitlab-ci.yml   two jobs on a schedule: belay-apply-sweep (MRs) and belay-apply-tripwire (demotions)
  apply.json       the group, the engine pin, belay-policy and belay-ledger, the bot's username, the targets
  README.md        this file
```

The scripts are not copied here. Each job clones `belay-engine` at `engine.ref` and checks that it resolves to
`engine.commit` (both required), then runs `gitlab/apply/sweep.mjs` and `gitlab/apply/tripwire-sweep.mjs` from that
checkout. The other files in this folder of the Belay repo (`*.mjs`, `*.test.mjs`) are those scripts and their tests. They
are not part of the project.

## What it promises

| # | Invariant | Where |
|---|---|---|
| 1 | No target job can read a write token: the target example and every belay-pack component name none, and `GITLAB_TOKEN` is set only by `glab auth login --job-token` | `../components/scripts/target-tokens.test.mjs` |
| 2 | Runs only its own CI config, from its protected default branch. Never checks out, includes or runs a target's code or CI config | `.gitlab-ci.yml` `workflow:rules`; the scripts read targets through the API only |
| 3 | Trusts nothing a target pipeline computed: reads author, head, diff, trailers and notes itself, re-derives the Proof Block with its own pinned engine from the evidence, runs the gate itself | `sweep.mjs`; test (v) |
| 4 | Evidence counts only from a finished merge request pipeline (`merge_request_event`) whose sha is the MR's head and that ran with no pipeline variables (F63). An MR that changes `.gitlab-ci.yml` (or the project's CI file), anything under `.gitlab/`, or a file the CI config includes locally gets no proof, no `proof::pass`, no approve, no merge: a WAIT note gives the reason. So does one whose CI config has an include with a variable or a wildcard (F68) | `ci-touch.mjs`; tests (iii), (iv) |
| 5 | Takes no value from pipeline variables, trigger variables or a webhook. A schedule is the baseline | `apply.json` holds every setting, including the engine pin; the settings below |
| 6 | Acts only on projects of the paired group (a shared-in project is skipped, F37) and only on agent MRs (`agent_prefix` and the `Belay-Task` trailer, `mr-context.mjs`) into the project's default branch (F78) | `lib.mjs` `targetsOf`; tests (vi), (xiv) |
| 7 | Each write once per project, MR and head; a second sweep writes nothing | read-back below; test (i) |
| 8 | Fails closed: a failed read stops that MR's writes and prints GitLab's message (the job ends red). No `BELAY_BOT_TOKEN` or no `BELAY_LEDGER_TOKEN`: report-only | tests "a failed read", "without BELAY_BOT_TOKEN", "without BELAY_LEDGER_TOKEN" |
| 9 | Reuses the existing write scripts, so every note is byte-identical | `post-proof.mjs`, `apply-gate.mjs`, `ledger-append.mjs`, `dispatch.mjs`, `tripwire.mjs` |

## One sweep, per agent MR

1. `mr-context.mjs` with the target's id: not an agent MR with a `Belay-Task` trailer, skip.
2. Reads, all before any write: the MR (`diff_refs.head_sha` is the head), the bot's own notes, the diff from base to
   head (`repository/compare`; a truncated diff is refused), and the CI file and its local includes at the head.
3. Reads the guardrail's `belay-guardrail` block for this head, from the guardrail account's notes only. The block is
   checked against its schema. A note that carries two blocks is ambiguous and counts as failing it (F67).
4. If the MR changes CI configuration: WAIT, with the reason, and `proof::pass` removed if an older head had it. Stop.
5. Takes the proof class from `trust-policy.yml` (the `Belay-Class` trailer's class) and the evidence:
   - `exploit-test`: the artifacts of the `belay-replay` job (`evidence/base|head/junit.xml`, `evidence/*/scan.json`;
     per target in `apply.json`), in the newest merge request pipeline of the MR whose sha is the head, once that pipeline
     is finished. A pipeline of another source (Run pipeline, API, trigger, schedule, push, downstream) is never read: each
     can carry pipeline variables, which outrank the evidence job's own. A merge request pipeline that ran with a pipeline
     variable is a WAIT (F63).
   - `cited-diff`: the guardrail's block. Without one the guardrail is dispatched as in step 7, and nothing is proved yet;
     an inconclusive one (schema, or two in one note) is a BLOCK (F77).
   - `rerun-stats`: the medic's block plus the jobs API.

   No finished pipeline for the head yet: nothing is written this sweep.
6. `build-evidence.mjs`, then `engine prove` with this job's engine. The Proof Block must name this head. Posts it with
   `post-proof.mjs` unless the bot already posted one for this head.
7. No guardrail verdict for the head yet: dispatches the guardrail (`dispatch.mjs`, the target's `guardrail_consumer_id`,
   `BELAY_DISPATCH_TOKEN`) once, marks it with the note `**Belay: guardrail review requested** for head <sha>`, and the gate
   waits.
8. `engine gate` over `tier-state.yml` as belay-policy has it when this MR is read, not as cloned when the sweep began, so
   a revoke made during a sweep is seen before anything is granted (F66). Then `apply-gate.mjs`: note, `belay::tier::*`, `guardrail::*`, approve or
   auto-merge pinned to the head (`--sha`). Then `ledger-append.mjs` with the gate's events, in one commit.

A forced decision (CI change, no class, no proof derivable, a guardrail block that fails its schema or shares its note with another) is one gate note that
names the head. A guardrail **block** for the head always makes it a BLOCK with `guardrail::block`, whatever else is
missing. A forced gate decides no tier and ledgers nothing, except that guardrail block: one `guardrail_verdict` event with
`verdict: block`, at the tier the engine's gate holds the agent and class at in the live `tier-state.yml`, so the poller
counts it even if the MR later merges on another head (r2 value-forced-block). With no class or no tier record there is
nobody to count it against, and nothing is ledgered. A forced wait or block for any other cause ledgers nothing.

**Read back before writing** (invariant 7):

| Write | Already done when |
|---|---|
| proof note and label | the bot's newest `belay-proof` note has `task.head_sha` = head (after a push and a return to an earlier head, it is posted again, F62) |
| gate note, labels, approve or merge | a bot `**Belay gate:` note is newer than that proof note and is not a forced one for another head, or a forced one of the same decision names the head in its first reason (`- head <sha>:`; a sha quoted further on does not count, F61) |
| ledger lines | a commit of `events/<project-id>.jsonl` in `belay-ledger` carries `Belay-Head: <project-id>!<iid>@<head>` |
| the guardrail's block for the head (a forced path, or a block after the gate, F81) | such a commit carries `Belay-Head: <project-id>!<iid>@<head>/guardrail-block` (the gate's own events carry both keys when the guardrail blocked) |
| a block after the gate (F81) | the MR has `guardrail::block` |
| guardrail dispatch | the bot's "guardrail review requested" note names the head (the Flows API lists no runs [S]) |

A ledger commit that failed is retried by the next sweep, from the gate's events re-emitted by `apply-gate --dry 1`.

## The tripwire

`tripwire-sweep.mjs` runs `tripwire.mjs --mode sweep` for each target, from a fresh clone of `belay-policy`, reading the
target with `BELAY_BOT_TOKEN` and committing with `BELAY_POLICY_TOKEN`. The detection is unchanged
(`../components/scripts/lib/detect.mjs`, `pipelines.mjs`). It covers revert, reopened finding, a post-merge proof that
failed, a default branch red for an hour, and a high guardrail block. The class an event demotes is the one the gate
decided on, from the bot's own `belay-ledger` lines for that MR, not the `Belay-Class` trailer, which the agent can edit
after the merge (F64); only an MR the engine never gated falls back to the trailer. It is idempotent by the `Belay-Event:` keys in
`belay-policy`'s history, and it never lands over a newer `tier-state.yml` (`last_commit_id`). The demotion now comes at
the next sweep, not in the target's own push pipeline. Run the schedule often (every 10 minutes).

## Settings the operator makes on belay-apply

Checked on docs.gitlab.com on 2026-10-07 unless marked `[R?]`.

| Where | Setting | Why |
|---|---|---|
| Group | Create project `belay-apply`; push this folder to its `main` | |
| Settings > Repository > Protected branches | `main`: allowed to merge Maintainers, allowed to push and merge **No one**; **Allowed to force push** off; **Require approval from code owners** on, with a `CODEOWNERS` that covers `.gitlab-ci.yml` and `apply.json` (this folder ships no `CODEOWNERS`; the operator adds it) | Only a reviewed merge changes what runs with the tokens, and one Maintainer alone cannot change it [R?] |
| Settings > CI/CD > Variables | `BELAY_BOT_TOKEN`, `BELAY_POLICY_TOKEN`, `BELAY_DISPATCH_TOKEN`, `BELAY_LEDGER_TOKEN`: each **Protect variable** on, **Masked and hidden**. Set them on belay-apply at **project level only**, never as group or instance variables of the paired group | Protected: "only available in pipelines that run on protected branches or protected tags" [S]. Hidden can only be chosen when the variable is created [S]. Every target pipeline inherits the group's variables, so a group-level token would reach the agents' jobs [R?] |
| Settings > CI/CD > Variables | **Minimum role to use pipeline variables**: `no_one_allowed` (API `ci_pipeline_variables_minimum_override_role`) | Pipeline variables (Run pipeline form, schedules, the pipelines API, the triggers API) outrank project variables [S], so one could override a token, `NODE_OPTIONS` or a `GIT_*` variable |
| Build > Pipeline schedules | One schedule on `main`, every 10 minutes, **with no variables**, owned by a Maintainer of belay-apply | A schedule runs with its owner's permissions, and on a protected branch the owner needs merge rights [S] |
| belay-engine and belay-policy: Settings > CI/CD > Job token permissions | add `belay-apply` to the allowlist | the jobs clone both with `CI_JOB_TOKEN` [S] |
| Membership | no agent service account is a member of belay-apply, belay-engine, belay-policy, belay-ledger or belay-pack, directly or through the group. Agents get project-level membership on the targets only | a member with push could open a pipeline on another branch. It would get no protected variable, but it is still noise. Membership of the others lets an agent change what the jobs run or read [R?] |
| Settings > Repository > Protected tags / branches | in belay-engine and belay-pack: protect the `v*` tags; in belay-ledger: protect `main`. Allow Maintainers (or No one) to create or push, not Developers | the jobs clone the engine and the pack at a tag, and the ledger is the record of what was gated [R?] |
| Runners (F73) | belay-apply's jobs run on a project runner marked **protected** that no target uses, or on GitLab-hosted ephemeral runners. Never on a shared shell or docker-socket runner that target jobs use | on a runner shared with target pipelines, an agent's test job can read a concurrent belay-apply job's environment or files [R?] |
| Settings > General > Visibility | belay-apply is **Private**, and **Public pipelines** (Settings > CI/CD > General pipelines) is off. Leave belay-apply's own job token allowlist at its default | the job logs name every MR the sweep touched. With the default allowlist no target job token can read belay-apply [R?] |
| `apply.json` | `engine.commit` (40 hex, the commit `engine.ref` resolves to), `glab.sha256` (the published checksum of that glab tarball), `bot`, `targets` with each one's `guardrail_consumer_id`. Also pin the job image by digest in `.gitlab-ci.yml` (`image: node:22-bookworm@sha256:<digest>`; F70, proposed, the operator picks the digest) | the jobs refuse an empty commit or checksum. The image runs with all four tokens, and a moving tag is not what was reviewed [R?] |

Tokens:

| Token | Kind | Needs |
|---|---|---|
| `BELAY_BOT_TOKEN` (F72, proposed) | a bot user's or service account's token, scope `api`. The account is Developer on the target projects only and Reporter on belay-policy and belay-ledger, and never a member of belay-apply or belay-engine. Not a group access token of the paired group: that reaches every project in the group and defeats the separate `BELAY_POLICY_TOKEN` | read every target (MRs, notes, pipelines, jobs, artifacts, files, compare); post notes and labels, approve, merge; read the ledger and policy history. Its username goes in `apply.json` `bot` and in the app's `BELAY_PROOF_AUTHORS` |
| `BELAY_POLICY_TOKEN` | project access token of `belay-policy`, `write_repository` or `api`, allowed to push to its `main` (spike S8) | the tripwire's commit |
| `BELAY_LEDGER_TOKEN` (required) | project access token of `belay-ledger`, `api` | ledger commits. Required so the bot token never writes the ledger: with it unset the sweep only reports, as without `BELAY_BOT_TOKEN`, and its log names the missing token |
| `BELAY_DISPATCH_TOKEN` | a token that may create flow runs in the targets (spike S1) | `POST /ai/duo_workflows/workflows` |

**Optional wake-up.** A pipeline trigger token (Settings > CI/CD > Pipeline trigger tokens) can start a sweep sooner, for
example from a webhook relay. It carries nothing the sweep uses: every value comes from `apply.json` and GitLab's API.
`[R?]` The docs do not say whether `no_one_allowed` also refuses variables sent through the triggers API, so create a
trigger token only after checking that on the instance. The schedule alone is enough.

## Known residuals

- F63: evidence counts only from a `merge_request_event` pipeline that carries no pipeline variables (498f1fb). A target
  that runs `belay-replay` only in branch pipelines gets no proof until it switches to merge request pipelines.
- F74: closed in the sweep. An auto-merge the bot set is cancelled (`POST .../cancel_merge_when_pipeline_succeeds`, `[R?]`
  the endpoint's current name) and a note says why, at the first sweep after a revoke or tripwire demotion makes the gate
  say anything but merge; an auto-merge a person set is left alone. Until that sweep (at most one schedule interval) the
  MR can still merge if its pipeline succeeds. `[R?]` whether a push cancels an auto-merge set with `--sha`.

- F89: closed in the sweep (03eb2d8). For an MR whose gate is done, the sweep also reads the approvals and re-gates a head
  the bot approved. When the gate now says neither approve nor merge, it unapproves as the bot (`POST .../unapprove`, which
  removes only the caller's own approval, never a person's) and a note names the decision and the tier. Without the write
  tokens it only reports. Whether a push keeps an approval the bot gave an earlier head depends on the target's "Remove
  all approvals when commits are added" setting, so the sweep does not rely on it: on an MR whose bot notes show an
  APPROVE for an earlier head (an engine gate note stands for the head of the bot proof note before it), the approvals are
  read too, and the bot's is withdrawn unless the current head's gate says approve or merge, also while the current head
  has no gate decision yet (no finished pipeline, no guardrail or medic verdict). Other MRs read approvals only once the
  gate is done for the head, as before.
- F77: closed in the sweep. A `cited-diff` class with no guardrail verdict for the head dispatches the guardrail (step 7)
  instead of returning before it and waiting for ever, and an inconclusive verdict is a forced BLOCK, as for every other class.
- F81: closed in the sweep. A guardrail block for a head whose gate was already applied (the guardrail re-ran) re-runs the
  gate: the bot's approval and auto-merge are withdrawn (F74, F89), and while the MR lacks `guardrail::block` the BLOCK
  note and the label are written again. The block is ledgered once as a `guardrail_verdict` with `verdict: block`
  (`Belay-Head: <key>/guardrail-block`), so the poller counts it. If a person removes the label, the next sweep sets it
  again. A head gated before this change on a guardrail block gets that event once more: a duplicate the poller counts once
  (it counts merge requests, not events).
- F67: closed (5d09815). A trusted note that carries two blocks of the tag is ambiguous: `fetch-block.mjs` exits 4, as for
  a schema failure, so a block the note quotes never wins.
- F88: closed (b53cd46). `ledger-append.mjs` refuses a `--write-token-var` that names an unset variable, before any read;
  without the flag (a person running it by hand) it keeps its fallback. Its sibling in `tripwire.mjs` is closed the same
  way: `tripwire-sweep.mjs` names `BELAY_POLICY_TOKEN`, and an unset one is refused before any read, so `GITLAB_TOKEN` (the
  bot token) never commits `tier-state.yml`.
- F71: closed (5dee0f1). `glue()` hands a child none of the four tokens it inherits; each call that writes adds its own
  (`tokens()` in `lib.mjs`): post-proof and apply-gate the bot token, ledger-append the ledger token, tripwire the policy
  token, dispatch the dispatch token as `GITLAB_TOKEN`. Every child still reads with `GITLAB_TOKEN`, the bot token.
- F68: closed (f5a0a33). An include whose path or project carries a variable, or whose path is a wildcard, counts as
  touching CI (`ci-touch.mjs`): the MR waits for a person. A target that includes with a wildcard waits on every agent MR
  until it lists its includes by name.
- F69, accepted: the compare API's diff cap (`sweep.mjs:56-69`, `diffOf`). The envelope (`max_files` 6, `max_lines` 120) blocks any
  diff large enough to reach it; re-open it if the envelope is widened.
- F75: closed in `detect.mjs`. A `Revert "..."` commit names the commit it reverts in a message its author writes, so a
  revert that another agent's MR carried onto the default branch demotes nobody; a person's revert and the agent's own
  still do. One read (`repository/commits/<sha>/merge_requests`) per revert commit.
- F79, accepted: `loadConfig` does not check that policy and ledger are inside `cfg.group` (`lib.mjs:21-23`). `apply.json`
  changes only through a code-owner-reviewed merge on belay-apply's protected `main`.

## What the operator removes from each target

- Settings > CI/CD > Variables: delete `BELAY_BOT_TOKEN`, `BELAY_POLICY_TOKEN`, `BELAY_LEDGER_TOKEN` and
  `BELAY_DISPATCH_TOKEN`. Then revoke and re-create each token that was ever stored there: any job of an agent MR pipeline
  could have read it.
- Build > Pipeline schedules: delete the `tripwire` schedule (`BELAY_TRIPWIRE=sweep`). Its job is no longer in the target.
- `.gitlab-ci.yml`: drop the `tripwire`, `ledger-append` and `flow-dispatch` includes and the `rerun-stats` proof include,
  as the example now does. Those components are gone from belay-pack.
- The `belay/*` protected-branch pattern (Setup step 9) can stay: it still keeps the agents' branches to the flow accounts.
  It no longer gives a token to anything.

## M2's two bars, through belay-apply

**12 Oct: `guardrail::block` on the seeded changelog-injection MR.** The guardrail flow is started by belay-apply's sweep
(step 7) for the MR's head, and posts its `belay-guardrail` block with verdict `block` and the quoted changelog hunk. The
next sweep reads it as a trusted note for the current head and applies it. With a proof, `engine gate` blocks
("guardrail blocked"). Without one, for example when the MR's class has no evidence builder, the forced note is a BLOCK.
Either way `apply-gate.mjs` sets `guardrail::block`, writes the BLOCK note, and grants nothing. Needs: `BELAY_BOT_TOKEN`
and `BELAY_DISPATCH_TOKEN` on belay-apply, the guardrail's consumer id in `apply.json`, and the guardrail account in
`guardrail_authors`. If the MR changes CI configuration, it is a BLOCK all the same, and the note also says why nothing
else was granted. Test: `sweep.test.mjs` (ii).

**16 Oct: the hands-off merge of D-101.** D-101's agent and class stand at `hands_off` in `tier-state.yml` (a person's
promotion MR). The MR changes no CI configuration. Its `belay-replay` job ran in a pipeline of the current head. Then the
sweep derives an `exploit-test` pass from those artifacts, the guardrail passes for that head, the change is inside the
hands-off envelope, and `engine gate` says `merge`. `apply-gate.mjs` runs `glab mr merge --auto-merge --sha <head>`, so a
push after the sweep read the head is never merged. The ledger records the proof, guardrail and tier events. Test:
`sweep.test.mjs` (i) takes the same path at `supervised`, ending in an approve.

## Verify (`[R?]`)

- `[R?]` Whether `ci_pipeline_variables_minimum_override_role: no_one_allowed` also refuses variables sent through the
  triggers API and set on schedules. The page says it limits "who can run pipelines with pipeline variables" and lists both
  as pipeline-variable sources, but does not say so explicitly.
- `[R?]` `GET /projects/:id/repository/compare`: the `compare_timeout`, `too_large` and `collapsed` fields used to
  refuse an incomplete diff, and whether `diff` always starts at the first `@@`.
- `[R?]` `GET /projects/:id/merge_requests/:iid/pipelines` lists the MR's pipelines newest first with `sha` and `status`.
  A merged-results pipeline runs on a merge commit, not on the head, so its evidence never counts. A target that uses
  merged-results pipelines needs a detached pipeline of the head as well.
- `[R?]` `GET /projects/:id/jobs/:job_id/artifacts/*artifact_path` for a single artifact file.
- `[R?]` `GET /projects/:id/pipelines/:id/variables` lists every variable a pipeline was created with (Run pipeline,
  API, trigger, push option, downstream), and a merge request pipeline can carry none (push options pass variables to
  branch pipelines only). A list row without `source` is checked through `GET /projects/:id/pipelines/:id`. Job-level
  variables of a manual job are not listed there: the evidence job must not be `when: manual`.
- `[R?]` `ci_config_path` in `GET /projects/:id`. A CI file in another project (`path@group/project`) is treated as out of
  the MR's reach. A wildcard or variable include is not followed: it counts as touching CI (F68).
- `[R?]` A group access token's approval counts toward the target's approval rules (spike S2). Auto-merge set after the
  pipeline already finished merges at once.
- `[R?]` The glab release asset URL (as in the components).
- `[R?]` The Flows API's token scope and the run's identity (spike S1, as before).
- Residual, by design: the evidence is still the output of the target's own test job. The agent writes the code and the
  test, so the exploit test is what is proven, not every other line. belay-apply only removes the agent's control over
  *which jobs* ran (CI changes wait for a person) and over *what was posted*.
