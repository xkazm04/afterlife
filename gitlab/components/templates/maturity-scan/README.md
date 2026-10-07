# maturity-scan

Scheduled, read-only scan of the target project. It collects the facts a stage-by-rung score needs (CI config, protected
branches, environments, approval rules, schedules, CODEOWNERS, the latest green pipeline's jobs) into `facts.json`, then asks the
engine to score them. A fact it cannot read is recorded as `{error}`, never as absent.

**Job:** `belay-maturity-scan`. **Stage:** `.post`. **Runs:** on a schedule or an API pipeline with `BELAY_SCAN=maturity`.

## Include

```yaml
include:
  - component: $CI_SERVER_FQDN/acme/belay-pack/maturity-scan@1.0.0
    inputs:
      engine_ref: v0.1.0
```

Schedule it daily on the default branch with `BELAY_SCAN=maturity`.

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
| `scan_command` | string | `"scan"` | The engine command that scores facts.json. [R?] Not in the engine CLI contract (docs/BACKEND-PLAN.md section 3); the job may fail until it exists. |

## Status

The collector is real. **The scorer is not in the engine CLI contract** (docs/BACKEND-PLAN.md section 3 has no `scan`
command), so `scan_command` defaults to `scan` and the job is `allow_failure: true` until the engine has it. Artifacts:
`.belay/facts.json`, `.belay/maturity.json`.

## Verify

- `[R?]` `GET /projects/:id/ci/lint?include_jobs=true` as the source of the merged CI config; the rest are `[R]` list endpoints.
