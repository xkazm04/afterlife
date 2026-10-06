# ledger-append

Appends events to `belay-ledger/events/<project-id>.jsonl`. The engine does the hashing (`ledger append`); this component
only reads the current file, asks the engine for the next chained lines, and makes one commit.

**Job:** `belay-ledger-append`. **Stage:** `.post`. **Runs:** after `belay-tier-gate` on merge request pipelines (even when
the gate blocked), and on `api`/`trigger`/`pipeline`/`schedule` pipelines that carry `BELAY_EVENT_JSON`.

## Include

```yaml
include:
  - component: $CI_SERVER_FQDN/acme/belay-pack/ledger-append@1.0.0
    inputs:
      engine_ref: v0.1.0
```

The events come from `.belay/events/*.json` (the gate's artifact, in name order) and from `BELAY_EVENT_JSON` if set. The job is
`allow_failure: true` and uses `resource_group`, so two runs never interleave their appends.

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
| `ledger_project` | string | `"$CI_PROJECT_ROOT_NAMESPACE/belay-ledger"` |  |
| `ledger_branch` | string | `"main"` |  |
| `write_token_var` | string | `"BELAY_BOT_TOKEN"` | Name of the CI variable holding a token that may write belay-ledger. |

## Verify

- **The ledger schema rejects the gate's events today.** `apply-gate.mjs` writes `observed_by: "ci_job"`, which
  `src/schemas/ledger.ts` and `engine/commands/ledger.ts` do not list (`poll`, `flows_api`, `govern_hook`, `webhook`). Add it
  there, or the engine refuses the append and the job fails (visibly, but with no ledger line).
- `[R?]` the event `at` is the job's clock; the ledger comment wants the GitLab event time.
- The commit message carries `[skip ci]` (`[R]` docs.gitlab.com/ci/pipelines/#skip-a-pipeline).
