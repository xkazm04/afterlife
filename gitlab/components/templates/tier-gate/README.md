# tier-gate

At merge request time, reads `tier-state.yml` from `belay-policy` and runs the engine's `gate`, in the target's own
pipeline, **report-only**: the decision is the job's artifact and log, and `apply-gate.mjs` runs with `--dry 1`. The gate
that approves, sets merge-when-pipeline-succeeds or blocks is [belay-apply](../../../apply/README.md)'s. It runs the same
engine `gate` itself, on a proof it derived, because a target pipeline holds no write token (F4, decided 2026-10-07, ask
6696d24d). No model takes part in a tier decision.

**Job:** `belay-tier-gate`. **Stage:** `.post` (runs last, after the proof). **Runs:** on merge request pipelines of agent MRs.

## Include

```yaml
include:
  - component: $CI_SERVER_FQDN/acme/belay-pack/tier-gate@1.0.0
    inputs:
      engine_ref: v0.1.0
      engine_commit: '<40-char sha of that tag>'
      proof_authors: belay-bot            # belay-apply's bot account (its "bot" in apply.json)
```

## What it does

1. Skips MRs not written by an `agent_prefix` account with a `Belay-Task` trailer (a person's MR needs no gate).
2. Takes the action class from the `class` input or the MR's `Belay-Class:` trailer. None: it leaves the MR waiting.
3. Reads the newest `belay-proof` block from notes by `proof_authors` only, made for the current head SHA (`task.head_sha`).
   None yet: waits. A proof for an earlier push never counts, so a provided evidence file must carry `task.head_sha`.
4. Waits up to `wait_minutes` for a `belay-guardrail` block from the guardrail's service account, for the current head
   SHA, checked against `flows/schemas/guardrail-verdict.schema.json`. None: waits (nothing granted). A malformed one: blocks.
5. Runs `engine gate --policy --state --class --agent --proof --guardrail --diff` and passes its JSON to `apply-gate.mjs`:

   | Decision | Effect |
   |---|---|
   | `merge` | `glab mr merge --auto-merge --sha <head>`: merges when the pipeline succeeds |
   | `approve` | `glab mr approve --sha <head>`: the gate account approves, a person still merges |
   | `wait` | nothing granted; the note says why |
   | `block` | nothing granted and the job fails, so the MR pipeline is red |

   In this job every effect is reported, never applied: `apply-gate.mjs --dry 1`.
6. Reports the `belay::tier::<tier>` and `guardrail::pass|block` labels and the note it would set, and writes ledger event
   bodies to `.belay/events/` as an artifact. belay-apply applies the same decision and appends the ledger.

Fails closed: a missing or invalid input never produces `merge` or `approve`. An engine error (`{"error": ...}`) stops the job
with exit 2. It never writes.

## Needs

- No Belay token: `CI_JOB_TOKEN` reads the MR and its notes. The bot that approves is belay-apply's (spike S2: a service
  account may not satisfy an approval rule; the fallback is the gate merging with a scoped token).
- `belay-policy` allowlists this project's job token.
- Protected branch `main` with at least one human approval rule for `assisted` and `supervised`, so `wait` and `approve` hold.

## Inputs

| Input | Type | Default | Meaning |
|---|---|---|---|
| `stage` | string | `".post"` |  |
| `engine_ref` | string | **required** | Tag, branch or full SHA of the Belay engine to run. Required, so the checker is always pinned. |
| `engine_commit` | string | `""` | Optional 40-char SHA the checkout must resolve to. Set it when engine_ref is a tag or branch. |
| `engine_project` | string | `"$CI_PROJECT_NAMESPACE/belay-engine"` | Project path holding the Belay repo (engine/, src/schemas, gitlab/). Must allowlist this project's job token. |
| `policy_project` | string | `"$CI_PROJECT_NAMESPACE/belay-policy"` |  |
| `policy_ref` | string | `"main"` |  |
| `node_image` | string | `"node:22-bookworm"` |  |
| `glab_version` | string | `"1.120.0"` |  |
| `glab_sha256` | string | `""` |  |
| `runner_tags` | array | `[]` |  |
| `proof_authors` | string | **required** | Comma-separated usernames allowed to post the Proof Block note (belay-apply's bot account). A note by anyone else is ignored. |
| `guardrail_authors` | string | `"ai-guardrail-$CI_PROJECT_ROOT_NAMESPACE"` | Comma-separated usernames of the guardrail flow service account. [R?] the exact ai-<flow>-<group> form. |
| `agent_prefix` | string | `"ai-"` |  |
| `class` | string | `""` | Action class id (trust-policy.yml classes). Empty reads the Belay-Class trailer from the MR description. |
| `wait_minutes` | number | `10` | How long to wait for the guardrail verdict before leaving the MR waiting for a person. |
| `emit_events` | boolean | `true` | Write ledger event bodies to .belay/events, as an artifact (belay-apply appends the ledger). |

## Verify

- `[R?]` which identity a gate approval counts as, and whether auto-merge set from a job inside the pipeline it waits for behaves.
- `[R?]` the guardrail service account name (`ai-guardrail-<group>`): confirm after enabling the flow.
