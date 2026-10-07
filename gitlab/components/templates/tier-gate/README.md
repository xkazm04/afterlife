# tier-gate

At merge request time, reads `tier-state.yml` from `belay-policy`, runs the engine's `gate`, and approves, sets
merge-when-pipeline-succeeds, or leaves the MR waiting. No model takes part in a tier decision.

**Job:** `belay-tier-gate`. **Stage:** `.post` (runs last, after the proof). **Runs:** on merge request pipelines of agent MRs.

## Include

```yaml
include:
  - component: $CI_SERVER_FQDN/acme/belay-pack/tier-gate@1.0.0
    inputs:
      engine_ref: v0.1.0
      engine_commit: '<40-char sha of that tag>'
      proof_authors: belay-bot            # the user behind BELAY_BOT_TOKEN
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

6. Sets `belay::tier::<tier>` and `guardrail::pass|block`, posts a short note, writes ledger event bodies to
   `.belay/events/` for the `ledger-append` component.

Fails closed: a missing or invalid input never produces `merge` or `approve`. An engine error (`{"error": ...}`) stops the job
with exit 2. Without `BELAY_BOT_TOKEN` it only reports.

## Needs

- `BELAY_BOT_TOKEN` as for proof-engine, and the bot must be allowed to approve (spike S2: a service account may not satisfy an
  approval rule; the fallback is the gate merging with a scoped token).
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
| `proof_authors` | string | **required** | Comma-separated usernames allowed to post the Proof Block note (the BELAY_BOT_TOKEN user). A note by anyone else is ignored. |
| `guardrail_authors` | string | `"ai-guardrail-$CI_PROJECT_ROOT_NAMESPACE"` | Comma-separated usernames of the guardrail flow service account. [R?] the exact ai-<flow>-<group> form. |
| `agent_prefix` | string | `"ai-"` |  |
| `class` | string | `""` | Action class id (trust-policy.yml classes). Empty reads the Belay-Class trailer from the MR description. |
| `wait_minutes` | number | `10` | How long to wait for the guardrail verdict before leaving the MR waiting for a person. |
| `emit_events` | boolean | `true` | Write ledger event bodies to .belay/events for the ledger-append component. |

## Verify

- `[R?]` which identity a gate approval counts as, and whether auto-merge set from a job inside the pipeline it waits for behaves.
- `[R?]` the guardrail service account name (`ai-guardrail-<group>`): confirm after enabling the flow.
