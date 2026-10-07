# belay-pack: CI/CD components

This folder is the root of the `belay-pack` project, a CI/CD Catalog project: a `README.md` and a top-level `templates/`
directory, with each component as `templates/<name>/template.yml` ([S] docs.gitlab.com/ci/components/). Releasing a tag
publishes the version. Targets include a component as
`$CI_SERVER_FQDN/<group>/belay-pack/<name>@<version>`.

| Component | Job | Does |
|---|---|---|
| [`proof-engine`](templates/proof-engine/README.md) | `belay-proof-<class>` | Re-derives a Proof Block with no model; posts the note and `proof::*` label |
| [`tier-gate`](templates/tier-gate/README.md) | `belay-tier-gate` | Reads `tier-state.yml`; approves, auto-merges or waits; blocks on failure |
| [`tripwire`](templates/tripwire/README.md) | `belay-tripwire` | Demotes on bad outcomes; commits `tier-state.yml` to `belay-policy` |
| [`maturity-scan`](templates/maturity-scan/README.md) | `belay-maturity-scan` | Scheduled, read-only fact collection and scoring |
| [`ledger-append`](templates/ledger-append/README.md) | `belay-ledger-append` | Appends hash-chained events to `belay-ledger` |
| [`flow-dispatch`](templates/flow-dispatch/README.md) | `belay-flow-dispatch` | Starts a flow through the Flows API where a trigger cannot fire |

`flow-dispatch` is not in the original list. It is here because bot-authored merge requests do not fire flow triggers
(see its README).

## Projects and the engine checkout

Every job fetches the Belay repository at a pinned ref into `.belay-engine/` and runs `npx tsx engine/cli.ts <cmd>` there
(the contract in `docs/BACKEND-PLAN.md` section 3). The glue in `scripts/` is read from the same checkout. Add
`.belay-engine/`, `.belay-policy/` and `.belay/` to the target's `.gitignore`.

| Project | Holds | Who reads it |
|---|---|---|
| `belay-pack` | these components (this folder) | every target pipeline, at include time |
| `belay-engine` | the Belay repo: `engine/`, `src/schemas/`, `gitlab/` | every job, cloned at `engine_ref` |
| `belay-policy` | `trust-policy.yml`, `tier-state.yml`, `CODEOWNERS` | proof-engine, tier-gate (read); tripwire (write) |
| `belay-ledger` | `events/<project-id>.jsonl` | ledger-append (write) |

`engine_ref` has no default on purpose: the checker is always pinned. Pass `engine_commit` as well when the ref is a tag or a
branch, and the job refuses a checkout that resolves anywhere else. Each proof records the engine's own source hash.

## Tokens: what a job token can and cannot do

Verified on docs.gitlab.com/ci/jobs/ci_job_token/ [S]: a job token can read merge requests and notes and can `git clone` or push
across projects that allowlist it. It **cannot** create or edit MR notes, update labels, approve, merge or commit files by API.
So the components use two kinds of credential:

| Credential | Used for | Where it must be |
|---|---|---|
| `CI_JOB_TOKEN` | clone `belay-engine` and `belay-policy`; read MRs and notes | allowlist both projects' job token settings to include the target |
| `BELAY_BOT_TOKEN` | post notes and labels, approve, merge, read for the tripwire | CI variable, masked. **Unset in M1**: see below |
| `BELAY_POLICY_TOKEN` | the tripwire's commit to `belay-policy` | CI variable, masked, **protected** |
| `BELAY_LEDGER_TOKEN` (optional) | ledger commits; the default reuses the bot token | CI variable, masked, protected. **Unset in M1** |
| `BELAY_DISPATCH_TOKEN` | flow-dispatch | CI variable, masked, protected |

Belay never stores a token. A missing `BELAY_BOT_TOKEN` is not an error: the components report what they would have done and
fail closed (the MR waits for a person).

**Exposure.** A merge request can edit `.gitlab-ci.yml`, so a variable that MR branches can read can be exfiltrated by an MR. Keep
the write tokens **protected**, and let only protected branches read them. For the agents' branches, make `belay/*` a protected
branch pattern that only the flow service accounts and Maintainers may push to, so the variable is available to the pipelines
that need it and to no ordinary contributor's branch. The
guardrail's CI-tamper rule and `CODEOWNERS` on `.gitlab-ci.yml` are the second line.

## M1: report-only, writes by hand

Decided by the operator on 2026-10-07 (asks da7cab11 and 3e69c7b1). For M1, CI runs report-only: `BELAY_BOT_TOKEN` stays unset,
so no job posts a note, sets a label or writes the ledger (`post-proof.mjs:39-42` and `apply-gate.mjs:56-57` only report, and
`ledger-append` has no write token). After V-204's pipeline, the operator makes its three writes by hand with their own `glab`
login: (1) the `belay-proof` note and the `proof::<verdict>` label, (2) `guardrail::pass`, (3) the ledger line. Their GitLab
username goes into the app's `BELAY_PROOF_AUTHORS`, so the poller believes the note. Finding F4 (High: once set,
`BELAY_BOT_TOKEN` is readable by every job in an agent MR pipeline) is **accepted for M1 only**. It is asked again before any M2
work arms a write token. No code changes.

In M1 the target leaves the `ledger-append` component out of its `include`: with no write token its CI commit can only fail, and
step 4 appends the line by hand.

Commands are for Git Bash on Windows, run from the Belay checkout with `glab` signed in as the operator. `<...>` is a placeholder.
On a self-managed host also set `CI_SERVER_FQDN=<host>` on the `node` commands (the default host is `gitlab.com`, `lib.mjs:7`).

**Preconditions**

- The proof job writes a proof only for an MR whose author starts with `agent_prefix` (default `ai-`) and whose description has
  a `Belay-Task: <ULID>` trailer. Otherwise `mr-context.mjs` exits 10 and the job is green with nothing written
  (`mr-context.mjs:22-26`).
- `tier-gate`'s `proof_authors` input (`tier-gate/template.yml:35`) must include the operator's username, or the gate never
  trusts the hand-posted note.
- `.env.local` for the app: `BELAY_MODE=live`, `BELAY_GROUP_ID=<the group V-204 runs in>` (the default is not that group),
  `BELAY_PROJECT=<target project path>`, `BELAY_PROOF_AUTHORS=<operator username>`
  (`src/server/data/README.md:12-15`, `src/server/poller/config.ts:44`).
- Every component defaults `engine_project`, `policy_project` and `ledger_project` to `$CI_PROJECT_NAMESPACE/belay-*`, the
  namespace the target itself sits in (F30; `tier-gate/template.yml:20,23`, `ledger-append/template.yml:36`). For a top-level
  target that is the group, as before. A target whose `belay-*` projects sit elsewhere passes all three inputs explicitly.
- The author defaults (`guardrail_authors`, and the `ai-guardrail-` / `ai-medic-` fallbacks for `BELAY_BLOCK_AUTHORS`) still
  use `$CI_PROJECT_ROOT_NAMESPACE`: a namespace path holds slashes and cannot be a username. A subgroup install checks the
  flow service account's real username and passes `guardrail_authors` (and `BELAY_BLOCK_AUTHORS`) explicitly.

**1. Fetch the proof** from the `belay-proof-exploit-test` job (its id is in the job's URL, `.../-/jobs/<id>`):

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
MR's notes: `glab mr view <iid> -R <target path> --comments`). It is the rule `apply-gate.mjs:34-37` applies:

```
glab mr update <iid> -R <target path> --label guardrail::pass --unlabel guardrail::block
```

**4. Append the ledger line.** Retry the gate, which now has a trusted proof; with a guardrail verdict the engine decides and
`apply-gate` writes the event bodies to `.belay/events`, reporting only (`apply-gate.mjs:40-54`):

```
glab ci retry belay-tier-gate -R <target path> -p <pipeline id>
mkdir <events dir>
glab api "projects/<project id>/jobs/<new gate job id>/artifacts/.belay/events/0-proof_verdict.json" > <events dir>/0-proof_verdict.json
glab api "projects/<project id>/jobs/<new gate job id>/artifacts/.belay/events/1-guardrail_verdict.json" > <events dir>/1-guardrail_verdict.json
glab api "projects/<project id>/jobs/<new gate job id>/artifacts/.belay/events/2-tier_decision.json" > <events dir>/2-tier_decision.json
BELAY_DIR=<Belay checkout as a C:/ path> CI_PROJECT_ID=<project id> node gitlab/components/scripts/decide/ledger-append.mjs --events <events dir> --project <group path>/belay-ledger --branch main
```

`ledger-append` takes every `*.json` in the directory, in name order, in one commit, each as seq n+1 on the chain it reads from
`belay-ledger`. Run it once per head. If the push to `main` is refused, add `--mode mr`. It reads the ledger with your own `glab` login and no
token variable. Only a 404 means there is no ledger file yet (the chain then starts at seq 1); any other failed read (403, 5xx,
no network) stops it with GitLab's message and writes nothing. The write carries the `last_commit_id` it read, so a ledger
that moved in between is refused: run it again.

If the gate cannot decide (no guardrail verdict, so it forces `wait` and emits nothing), the ledger line waits. **Never
hand-write an event**: `LedgerEvent.observed_by` has no value for a person (`src/schemas/ledger.ts:25`), and `ci_job` would be false.

Checked on 2026-10-07: every `glab` subcommand and flag above against `glab 1.120.0 --help` (`api`, `mr view`, `mr update`,
`mr note create`, `ci retry`; no command that talks to a host was run), and steps 2 and 4 by running the scripts against a fake
`glab`: the note parses back through `blocks()` with tag `belay-proof`, the label call is as written, and `ledger-append` on
events as `apply-gate` writes them appends seq 3, 4, 5 to a chain of two.

## The files the jobs write and read

Notes written by the flows carry a fenced block, so Belay and the engine find them without parsing prose:

| Fence tag | Written by | Read by | Schema |
|---|---|---|---|
| `belay-proof` | proof-engine (the bot) | tier-gate, Belay | `src/schemas/proof.ts` |
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
with its idempotence, and a two-event ledger append.

## Verified against, and not

Each template's header lists the doc pages its syntax was checked on (2026-10-06). What could not be verified is marked `[R?]` in
the template or the component README.
