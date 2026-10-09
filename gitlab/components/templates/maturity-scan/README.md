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
| `glab_sha256` | string | `""` | Optional SHA-256 of the glab linux amd64 tarball; checked when set. Unset, the download rests on HTTPS alone (F101). |
| `runner_tags` | array | `[]` |  |
| `scan_command` | string | `"scan"` | The engine command that scores facts.json (`engine/cli.ts scan --facts`, writes `belay.maturity/0`). |

The inputs that reach the shell (`engine_ref`, `engine_commit`, `engine_project`, `glab_version`, `glab_sha256`,
`scan_command`) each carry a `regex`; the job reads them from the inputs, never from a variable a pipeline could override
(F100).

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

## Security

Scan of the CI trust boundary, 2026-10-09 (branch `autopilot/codebase-security-scan-9b9b5883`). Findings follow F91-F99
(`infra/cloudrun/README.md`). Lines are as of this scan's last commit.

| # | Sev | Where | Finding | State |
|---|---|---|---|---|
| F100 | High | `template.yml:62-66`, `:98` (were `:44-50`, `:86`, `:93`) | The engine project, ref and commit pin, the glab version and checksum, and the scan command were job `variables:`. A pipeline variable (API, trigger, manual run) outranks a job's variables, so whoever could run the pipeline with variables chose the code run beside `CI_JOB_TOKEN` and a protected branch's variables, dropped the pin or checksum, or added words to the unquoted `$BELAY_SCAN_COMMAND` (question 5). | **Fixed** ef361ca: the boot step reads them from the inputs, fixed at include time; inputs that reach the shell carry a `regex`; the command is quoted. Every default passes, so an includer passing nothing works as before. Test: `collect-facts.test.mjs` "the maturity-scan template". |
| F101 | Medium | `template.yml:76-77` | With `glab_sha256` empty (the default), the glab tarball from gitlab.com is installed on HTTPS alone and runs holding `CI_JOB_TOKEN`, which can read the project, publish packages and releases and clone allowlisting projects. | **Open.** Failing closed would break includers that pass nothing. Fix: make the default the 1.120.0 tarball's checksum, checked against glab's own `checksums.txt` (a network read this scan could not make), or ship glab in `node_image`. |
| F102 | Medium | `collect-facts.mjs:42-49`, `:20` | `facts.json`, kept 90 days and public on a public project, copied whole answers: ci/lint's merged YAML (it can carry files included from private projects), approval rules with users and groups, schedules with owner and description, environments with external URLs, protected branches with per-user access levels, and an uncut error line. The engine reads none of that. | **Fixed** 80279c3: each fact keeps the fields the engine scores (CI jobs' `name`, `stage`, `allow_failure`; branch names) or names and counts; an error is cut to 200 characters. Test: `collect-facts.test.mjs` "keeps nothing the engine does not score". |
| F103 | Medium | `src/server/poller/maturityScan.ts:87` | `scanned_at` came from the artifact unchecked. A scan dated far ahead made every later real scan read as already stored (`latestScanAt >= job start`), freezing the cells; one dated far back became the stage's day 0. Anyone who can run an API pipeline with `BELAY_SCAN=maturity` writes that artifact. | **Fixed** 511f561: `scanned_at` must lie within the job's run, give or take 15 minutes of runner clock drift. Test: `maturityScan.test.ts` (iii) "dated after/before". |
| F104 | Medium | `src/server/poller/maturityScan.ts:93` | Any http(s) URL was stored as a rung's evidence link. The engine only cites objects under the project's `web_url`. | **Fixed** e67dec5: a scan citing another host or a sibling path is refused. Test: `maturityScan.test.ts` (iii) "citing another site / a sibling path". |
| F105 | Medium | `template.yml:68-70` | With `engine_commit` empty (the default) and `engine_ref` a tag or branch, whoever can push that branch or move that tag in the engine project runs code in every includer's scan job, with its job token and, on a protected default branch, its protected variables. | **Open.** Requiring a SHA would break includers that pass a tag only (the README's own example). Fix at the next major: require `engine_commit` unless `engine_ref` is a 40-char SHA; meanwhile protect `v*` tags in the engine project. |
| F106 | Medium | `src/server/poller/maturityScan.ts:30` | The default-branch filter is `ref=<branch>`, which a tag of the same name also matches. A Developer who can create an unprotected tag `main` controls that pipeline's CI, can run it from the API with `BELAY_SCAN=maturity`, and can write a `maturity.json` that passes every check here. Checks today: job name (`:35`), finished, source schedule or api (`:31`), default branch (this filter), project id (`:83`), shape (`parseMaturityScan`), F103, F104. | **Fixed** by the commit "fix(poller): list the scan pipelines with scope=branches (security F106)": the poller lists pipelines with `ref=<branch>&scope=branches`, so a tag pipeline never reaches the job read. GitLab's List project pipelines `scope` filter (`branches`, `tags`) is the only way to tell them apart, since the list response has no `tag` field ([R]: docs.gitlab.com/api/pipelines/#list-project-pipelines). Test: `maturityScan.test.ts` (v) "a tag pipeline named like the default branch, newer than the real scan, is not stored"; adapter and fake: `client.test.ts` "pipeline filters", `fake.test.ts` "filters pipelines by scope". Protecting tags in the target is still sound hygiene. |
| F107 | Low | `template.yml:23`, `:64`, `:83` | `engine_project`'s default expands `$CI_PROJECT_NAMESPACE` at run time, and the fetch URL and `glab auth` use `$CI_SERVER_FQDN`. A pipeline variable can override predefined variables [R?], pointing the fetch, and the job token in its URL, elsewhere. | **Accepted.** No unoverridable source for the host exists in the job. An `engine_commit` pin refuses redirected code; the token is the triggering user's own, valid only while the job runs. Set the project's "Minimum role to use pipeline variables" to Maintainer or "no one". |
| F108 | Low | `template.yml:64`, `:68` | Question 2: `CI_JOB_TOKEN` in the fetch URL. Not logged (no `set -x`, `git fetch -q`, GitLab masks the token); fetching by URL adds no remote to `.belay-engine/.git/config`, and git anonymizes the URL it writes to `FETCH_HEAD` [R?]; the cache keeps only `node_modules`; the artifacts are `.belay/*` only; glab keeps its login under `$HOME`, outside the project. | **Accepted.** |
| F109 | Low | `template.yml:53-54` | The cache is keyed by `engine_ref`, not the lockfile, so a moved branch restores another tree's `node_modules`. `npm ci` deletes `node_modules` before installing, and GitLab keeps protected and unprotected branch caches apart, so a poisoned cache is thrown away. | **Accepted.** The cache saves nothing either; drop it when next touched. |
| F110 | Low | `src/server/poller/maturityScan.ts:76` | Size: the artifact is read through `port.get`, capped only by the adapter's 64 MiB buffer (`src/server/gitlab/adapter/exec.ts:11`), then parsed whole. `parseMaturityScan` bounds the shape (nine typed cells, http(s) URLs) but not a note's or label's length or the evidence count, so a 60 MiB note is stored. | **Open.** A byte cap belongs in the port, caps per field in `src/schemas/maturity.ts`; both are outside this scan's paths. |
| F111 | Low | `template.yml:101-104` | Both artifacts are kept 90 days and are readable by anyone on a public project with public pipelines. After F102 `facts.json` holds names and counts, `maturity.json` evidence links and notes. | **Open, operator's call.** `artifacts:access: developer` would close it, but the poller's token must then be Developer or above to read the scan. |
| F112 | Low | `template.yml:47` | `node_image` is a tag, not a digest. | **Accepted.** An includer can pass `node:22-bookworm@sha256:...`. |
