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
| `BELAY_BOT_TOKEN` | post notes and labels, approve, merge, read for the tripwire | CI variable, masked |
| `BELAY_POLICY_TOKEN` | the tripwire's commit to `belay-policy` | CI variable, masked, **protected** |
| `BELAY_LEDGER_TOKEN` (optional) | ledger commits; the default reuses the bot token | CI variable, masked, protected |
| `BELAY_DISPATCH_TOKEN` | flow-dispatch | CI variable, masked, protected |

Belay never stores a token. A missing `BELAY_BOT_TOKEN` is not an error: the components report what they would have done and
fail closed (the MR waits for a person).

**Exposure.** A merge request can edit `.gitlab-ci.yml`, so a variable that MR branches can read can be exfiltrated by an MR. Keep
the write tokens **protected**, and let only protected branches read them. For the agents' branches, make `belay/*` a protected
branch pattern that only the flow service accounts and Maintainers may push to, so the variable is available to the pipelines
that need it and to no ordinary contributor's branch. The
guardrail's CI-tamper rule and `CODEOWNERS` on `.gitlab-ci.yml` are the second line.

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
