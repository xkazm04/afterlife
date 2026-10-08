# belay-pack: CI/CD components

This folder is the root of the `belay-pack` project, a CI/CD Catalog project: a `README.md` and a top-level `templates/`
directory, with each component as `templates/<name>/template.yml` ([S] docs.gitlab.com/ci/components/). Releasing a tag
publishes the version. Targets include a component as
`$CI_SERVER_FQDN/<group>/belay-pack/<name>@<version>`.

| Component | Job | Does |
|---|---|---|
| [`proof-engine`](templates/proof-engine/README.md) | `belay-proof-<class>` | Re-derives a Proof Block with no model, report-only: the proof is the job's artifact |
| [`tier-gate`](templates/tier-gate/README.md) | `belay-tier-gate` | Reads `tier-state.yml` and runs the gate, report-only: what belay-apply will decide |
| [`maturity-scan`](templates/maturity-scan/README.md) | `belay-maturity-scan` | Scheduled, read-only fact collection and scoring |

Every component runs with `CI_JOB_TOKEN` only and writes nothing to GitLab. All the writes are made by
[`belay-apply`](../apply/README.md), a separate project that holds the write tokens (F4, decided 2026-10-07, ask
6696d24d): the proof note and `proof::*` label, the gate's note, labels, approve and auto-merge, the ledger, the guardrail's
dispatch and the tripwire. The `tripwire`, `ledger-append` and `flow-dispatch` components are gone: each needed a write
token in the target's pipeline. Their scripts (`scripts/decide/tripwire.mjs`, `ledger-append.mjs`, `scripts/ops/dispatch.mjs`)
are what belay-apply runs.

## Projects and the engine checkout

Every job fetches the Belay repository at a pinned ref into `.belay-engine/` and runs `npx tsx engine/cli.ts <cmd>` there
(the contract in `docs/BACKEND-PLAN.md` section 3). The glue in `scripts/` is read from the same checkout. Add
`.belay-engine/`, `.belay-policy/` and `.belay/` to the target's `.gitignore`.

| Project | Holds | Who reads it |
|---|---|---|
| `belay-pack` | these components (this folder) | every target pipeline, at include time |
| `belay-engine` | the Belay repo: `engine/`, `src/schemas/`, `gitlab/` | every job, cloned at `engine_ref` |
| `belay-policy` | `trust-policy.yml`, `tier-state.yml`, `CODEOWNERS` | proof-engine, tier-gate (read); belay-apply (read; its tripwire writes) |
| `belay-ledger` | `events/<project-id>.jsonl` | belay-apply (write) |
| [`belay-apply`](../apply/README.md) | `.gitlab-ci.yml` and `apply.json` (`../apply/`); the four write tokens | its own schedule only. It reads the targets through the API and makes every Belay write |

`engine_ref` has no default on purpose: the checker is always pinned. Pass `engine_commit` as well when the ref is a tag or a
branch, and the job refuses a checkout that resolves anywhere else. Each proof records the engine's own source hash.

## Tokens: what a job token can and cannot do

Verified on docs.gitlab.com/ci/jobs/ci_job_token/ [S]: a job token can read merge requests and their notes, download job
artifacts, read a raw repository file and `git clone` across projects that allowlist it. It **cannot** create or edit MR
notes, update labels, approve, merge or commit files by API. It cannot list pipelines or their jobs, and it cannot read
protected branches, approval rules, pipeline schedules or `ci/lint` (none is on the page's list of allowed endpoints). It
cannot authenticate GraphQL. So the credentials are split by project:

| Credential | Used for | Where it must be |
|---|---|---|
| `CI_JOB_TOKEN` | in target pipelines: clone `belay-engine` and `belay-policy`; read MRs and notes. In belay-apply: clone the same two | both projects' job token allowlists include each target and `belay-apply` |
| `BELAY_BOT_TOKEN` | read the targets (MRs, notes, pipelines, jobs, artifacts, files); post notes and labels, approve, merge | **belay-apply only**: CI variable, **protected**, **masked and hidden** |
| `BELAY_POLICY_TOKEN` | the tripwire's commit to `belay-policy` | **belay-apply only**, protected, masked and hidden |
| `BELAY_LEDGER_TOKEN` (optional) | ledger commits; the default reuses the bot token | **belay-apply only**, protected, masked and hidden |
| `BELAY_DISPATCH_TOKEN` | starting the guardrail through the Flows API | **belay-apply only**, protected, masked and hidden |

Belay never stores a token. No target project holds any of the four, and no component names one
(`scripts/target-tokens.test.mjs` checks the example and every template). A missing `BELAY_BOT_TOKEN` on
belay-apply is not an error: belay-apply reports what it would have done and writes nothing, so the MR waits for a person.

**Exposure.** Every job of a pipeline can read the pipeline's CI/CD variables. That includes an agent's own test code, and
a `.gitlab-ci.yml` an MR edits on its branch, which runs before any review. Masking does not stop a job that encodes
the value. So a write token is never given to a pipeline whose code or config an agent can write: not as a masked
variable, and not as a protected one with `belay/*` protected (the agents push to `belay/*`). The tokens live on
belay-apply, which runs only its own config from its protected `main`, takes no pipeline variables (minimum role
`no_one_allowed`), and never runs a target's code. belay-apply also gives nothing to an MR that changes its own CI
configuration: such an MR chose which jobs made its evidence, so it waits for a person. The guardrail's CI-tamper rule and
`CODEOWNERS` on `.gitlab-ci.yml` are the second line. Settings: `../apply/README.md`.

## M1: report-only, writes by hand

Decided by the operator on 2026-10-07 (asks da7cab11 and 3e69c7b1). For M1, CI runs report-only, so no job posts a note, sets a
label or writes the ledger. Target pipelines hold no write token at all (`apply-gate` runs with `--dry 1`, and the proof
stays in the job artifact), and belay-apply has none set yet. After V-204's pipeline, the operator makes its three writes by hand with their own `glab`
login: (1) the `belay-proof` note and the `proof::<verdict>` label, (2) `guardrail::pass`, (3) the ledger line. Their GitLab
username goes into the app's `BELAY_PROOF_AUTHORS`, so the poller believes the note. Finding F4 (High: once set,
`BELAY_BOT_TOKEN` was readable by every job in an agent MR pipeline) was accepted for M1 only, to be asked again before M2.
The operator decided it on 2026-10-07 (ask 6696d24d, "Separate apply project"): every write moves to belay-apply
(`../apply/README.md`), and the write tokens are set there, never on a target. From M2 belay-apply makes the three writes
below itself, from evidence it re-derives. Until its tokens are set, these steps make them by hand.

Commands are for Git Bash on Windows, run from the Belay checkout with `glab` signed in as the operator. `<...>` is a placeholder.
On a self-managed host also set `CI_SERVER_FQDN=<host>` on the `node` commands (the default host is `gitlab.com`, `lib.mjs:7`).

**Preconditions**

- The proof job writes a proof only for an MR whose author starts with `agent_prefix` (default `ai-`) and whose description has
  a `Belay-Task: <ULID>` trailer. Otherwise `mr-context.mjs` exits 10 and the job is green with nothing written
  (`mr-context.mjs:22-26`).
- `tier-gate`'s `proof_authors` input (`tier-gate/template.yml:37`) must include the operator's username, or the gate never
  trusts the hand-posted note.
- `.env.local` for the app: `BELAY_MODE=live`, `BELAY_GROUP_ID=<the group V-204 runs in>` (the default is not that group),
  `BELAY_PROJECT=<target project path>`, `BELAY_PROOF_AUTHORS=<operator username>`
  (`src/server/data/README.md:12-15`, `src/server/poller/config.ts:44`).
- Every component defaults `engine_project` and `policy_project` to `$CI_PROJECT_NAMESPACE/belay-*`, the namespace the
  target itself sits in (F30; `tier-gate/template.yml:21,24`). For a top-level target that is the group, as before. A target
  whose `belay-*` projects sit elsewhere passes both inputs explicitly. belay-apply names all of them in its `apply.json`.
- The author defaults (`guardrail_authors`, and the `ai-guardrail-` / `ai-medic-` fallbacks for `BELAY_BLOCK_AUTHORS`) still
  use `$CI_PROJECT_ROOT_NAMESPACE`: a namespace path holds slashes and cannot be a username. A subgroup install checks the
  flow service account's real username and passes `guardrail_authors` (and `BELAY_BLOCK_AUTHORS`) explicitly.

**1. Fetch the proof** from the `belay-proof-exploit-test` job (its id is in the job's URL, `.../-/jobs/<id>`). This is the
target's report-only proof, made in the target's own pipeline: check it before you post it. belay-apply never does this;
it re-derives the proof from the evidence instead.

```
glab api "projects/<project id>/jobs/<belay-proof-exploit-test job id>/artifacts/.belay/proof.json" > <dir>/proof.json
node -e "const p=require('./<dir>/proof.json');console.log(p.verdict,p.task.head_sha)"
glab mr view <iid> -R <target path> -F json --jq .sha
```

The verdict must be `pass`, and `task.head_sha` must equal the MR's current head. To the poller, a proof made for an older head
is stale.

**2. Post it** with the component's own script, so the note is byte-identical to the one CI would post:

```
CI_PROJECT_URL=https://gitlab.com/<target path> BELAY_BOT_TOKEN=by-hand node gitlab/components/scripts/proof/post-proof.mjs --proof <dir>/proof.json --mr <iid>
```

`post-proof` only checks that the variable is set (`post-proof.mjs:39`) and never reads its value: `glab` posts with the
operator's own login. `by-hand` is not a secret. If `glab` is not on PATH, set `BELAY_GLAB=<path to glab.exe>`. It runs
`glab mr note create <iid> -R <url> -m <note>`, then `glab mr update <iid> -R <url> --label proof::<verdict> --unlabel` the
other two.

**3. Set `guardrail::pass`**, only when the guardrail's `belay-guardrail` verdict for the current head is `pass` (read it in the
MR's notes: `glab mr view <iid> -R <target path> --comments`). It is the rule `apply-gate.mjs:39-42` applies:

```
glab mr update <iid> -R <target path> --label guardrail::pass --unlabel guardrail::block
```

**4. Append the ledger line.** Retry the gate, which now has a trusted proof; with a guardrail verdict the engine decides and
`apply-gate` writes the event bodies to `.belay/events`, reporting only (`apply-gate.mjs`, `--emit-dir`):

```
glab ci retry belay-tier-gate -R <target path> -p <pipeline id>
mkdir <events dir>
glab api "projects/<project id>/jobs/<new gate job id>/artifacts/.belay/events/0-proof_verdict.json" > <events dir>/0-proof_verdict.json
glab api "projects/<project id>/jobs/<new gate job id>/artifacts/.belay/events/1-guardrail_verdict.json" > <events dir>/1-guardrail_verdict.json
glab api "projects/<project id>/jobs/<new gate job id>/artifacts/.belay/events/2-tier_decision.json" > <events dir>/2-tier_decision.json
BELAY_DIR=<Belay checkout as a C:/ path> CI_PROJECT_ID=<project id> node gitlab/components/scripts/decide/ledger-append.mjs --events <events dir> --project <group path>/belay-ledger --branch main
```

These are the target's report-only events, made in the agent's own MR pipeline: check them before you append them (F90).
A pipeline variable outranks the job's `BELAY_GUARDRAIL_AUTHORS`, so it can make the gate trust the agent's own note, and
a CI change can rewrite the job. `glab api "projects/<project id>/pipelines/<pipeline id>/variables"` must be `[]`, the MR
must change no CI file, `1-guardrail_verdict.json`'s `verdict` must be the one you read in the guardrail's note in step 3,
and `tier_at_time` must be the tier `tier-state.yml` holds for the agent and class. If any differs, append nothing.

`ledger-append` takes every `*.json` in the directory, in name order, in one commit, each as seq n+1 on the chain it reads from
`belay-ledger`. Run it once per head. If the push to `main` is refused, add `--mode mr`. It reads the ledger with your own `glab` login and no
token variable. If `--write-token-var` is given, the variable it names must be set: an unset one is refused before any read (F88, b85b78c). Without the flag, the write token falls back as before. Only a 404 means there is no ledger file yet (the chain then starts at seq 1); any other failed read (403, 5xx,
no network) stops it with GitLab's message and writes nothing. The write carries the `last_commit_id` it read, so a ledger
that moved in between is refused: run it again.

`1-guardrail_verdict.json` states the guardrail's verdict: `"verdict": "pass"` or `"block"`, from the guardrail file
`apply-gate` read (`--guardrail`). A guardrail file that states neither yields no `guardrail_verdict` event (`apply-gate`
says so on stderr), and the tier decision is then `1-tier_decision.json`. The engine's `ledger append` keeps the verdict, and
refuses one on any other kind or with any other value; the hash covers it. An event without a verdict has no `verdict` key,
so it hashes as every event written before the field did. The poller reads a stated pass as no guardrail block
(`src/server/poller/README.md`, "Record counters").

If the gate cannot decide (no guardrail verdict, so it forces `wait` and emits nothing), the ledger line waits. A forced
gate emits one event only: the guardrail's own block, as a `guardrail_verdict` with `"verdict": "block"`, when it is given
`--ledger-tier <tier>` and a guardrail file that states block (belay-apply passes both). A forced call for any other cause
emits nothing. Here, in the target's tier-gate, a forced call gets neither flag and emits nothing. **Never
hand-write an event**: `LedgerEvent.observed_by` has no value for a person (`src/schemas/ledger.ts:29`), and `ci_job` would be false.

Checked on 2026-10-07: every `glab` subcommand and flag above against `glab 1.120.0 --help` (`api`, `mr view`, `mr update`,
`mr note create`, `ci retry`; no command that talks to a host was run), and steps 2 and 4 by running the scripts against a fake
`glab`: the note parses back through `blocks()` with tag `belay-proof`, the label call is as written, and `ledger-append` on
events as `apply-gate` writes them appends seq 3, 4, 5 to a chain of two.

## The files the jobs write and read

Notes written by the flows carry a fenced block, so Belay and the engine find them without parsing prose:

| Fence tag | Written by | Read by | Schema |
|---|---|---|---|
| `belay-proof` | belay-apply's bot (`post-proof.mjs`), or the operator by hand in M1 | tier-gate, belay-apply, Belay | `src/schemas/proof.ts` |
| `belay-guardrail` | guardrail flow | tier-gate, tripwire, proof-engine (cited-diff) | `../flows/schemas/guardrail-verdict.schema.json` |
| `belay-claims` | patcher, gardener (MR description) | proof-engine | `../flows/schemas/claims.schema.json`, `gardener-claims.schema.json` |
| `belay-medic` | medic flow | proof-engine (rerun-stats) | `../flows/schemas/medic-verdict.schema.json` |

Only the accounts named in a component's inputs count: `fetch-block.mjs` ignores every other author, and ignores a verdict or a Proof
Block made for another head than the MR's current one (`head_sha`, or `task.head_sha` in a Proof Block). Trailers in the MR
description: `Belay-Task: <ulid>` (contract), plus `Belay-Class: <action class>` and `Belay-Finding: <id>` (added here; the gate
and tripwire need the class, and `reopened_finding` needs the finding).

## Scripts

`scripts/*.mjs` are plain Node 20 with no dependencies, and call `glab` and the engine through `execFileSync` (no shell string).
`BELAY_GLAB='node|fake-glab.mjs'` swaps in a fake for tests. Tested here against a fake `glab` and the real engine: the cited-diff
and exploit-test chains (`mr-context` to `fetch-block` to `build-evidence` to `prove`), `post-proof`, `apply-gate`, a tripwire sweep
with its idempotence, and a two-event ledger append. belay-apply's two sweeps (`../apply/*.test.mjs`) run these same
scripts end to end. `scripts/target-tokens.test.mjs` expands the target example with every component it includes and
fails on any write token.

## Verified against, and not

Each template's header lists the doc pages its syntax was checked on (2026-10-06). What could not be verified is marked `[R?]` in
the template or the component README.
