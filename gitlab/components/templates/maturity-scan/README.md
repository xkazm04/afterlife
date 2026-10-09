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
| `scan_command` | string | `"scan"` | The engine command that scores facts.json (`engine/cli.ts scan --facts`, writes `belay.maturity/0`). |

## Status

The collector and the scorer are real: `engine/cli.ts scan --facts .belay/facts.json` scores the facts by the rubric table in
`engine/README.md` and prints `belay.maturity/0` (nine cells, `src/schemas/maturity.ts`). It exits 2 when any cell is unknown,
which under a job token is the usual case (see Token), so the job stays `allow_failure: true` and keeps its artifacts either
way: `.belay/facts.json`, `.belay/maturity.json`. Belay's poller reads `.belay/maturity.json` from the newest
`belay-maturity-scan` job and stores its cells (`src/server/poller/README.md`).

Besides the facts above, the collector keeps what the rubric decides on: the project's `web_url` and
`merge_requires_pipeline` (`only_allow_merge_if_pipeline_succeeds`), the latest green pipeline's `web_url` and
`created_at`, each of its jobs' `id`, `web_url`, `finished_at` and artifact types, and `issue_templates` (one more read-only
GET of `.gitlab/issue_templates`; a 404 is `[]`).

## Token

The job runs with `CI_JOB_TOKEN` only, like every component (F4). A target pipeline holds no Belay token. A job token cannot
read protected branches, approval rules, pipeline schedules, `ci/lint` or the pipeline and job lists ([S]
docs.gitlab.com/ci/jobs/ci_job_token/: none is on its list of allowed endpoints). So in a target pipeline, `ci_config`,
`protected_branches`, `approval_rules`, `schedules` and `latest_pipeline_jobs` come back `{error}`, which the engine reads
as unknown, never as absent. A full scan needs a token that can read them, run from belay-apply. That is not built yet.

## Verify

- `[R?]` `GET /projects/:id/ci/lint?include_jobs=true` as the source of the merged CI config; the rest are `[R]` list endpoints.
