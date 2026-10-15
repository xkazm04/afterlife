# src/server/gitlab - GitLab port, glab adapter, doctor probes (module B1)

Server-only. The app imports `@/server/gitlab` (index.ts); tests and `belay doctor` import the parts.

| Part | What it is |
|---|---|
| `port.ts`, `types.ts` | `GitLabPort`: typed reads (group, projects, pipelines, jobs, trace, test summary, MRs, notes, diffs, environments, deployments, releases, schedules, files, tree, vulnerabilities, current user) and `execute(planned)` |
| `plan/` | Pure builders for the seven writes (B6 added `setIssueLabels` and `start_branch` on `commitFile`). Each returns `PlannedCommand {argv, display, risk}` and runs nothing |
| `adapter/` | Real: `glab api` through `execFile` (no shell). Pagination, 429 backoff, typed `GitLabError`. No token is read or stored; glab's keyring is the login |
| `fake/` | Fake: the same adapter over an in-memory `glab api` server seeded from `__fixtures__`. Writes (via `execute`) change its state. `fake/demo/` builds a whole fake group (`acme-lab`) from the demo dataset, for live mode without a real group (ledgerline has a `.gitlab-ci.yml` with T4 armed, for Setup's arm, disarm and verify) |
| `capabilities.ts` | `belay doctor` probes: available / unavailable / unknown, each with a basis (endpoint, plan, version, none) and a reason |
| `doctorCli.ts` | The doctor entry that `cli/belay.mjs doctor` runs through tsx. GET-only |
| `config.ts` | `BELAY_GLAB` (binary; else PATH; else `%LOCALAPPDATA%\Programs\glab\glab.exe`), `BELAY_GITLAB_HOST`, `BELAY_GROUP_ID` (default 144060371) |

## Real versus fake

- **Real and recorded 2026-10-06** (`__fixtures__/live/`): user, group (runner token removed), namespace
  (plan free), metadata (19.5.0-pre), empty project list, and the real 403/404 bodies for audit events,
  vulnerabilities and the Flows API. Tests replay them, nothing here calls GitLab.
- **[R] from docs** (`__fixtures__/docs/`): everything the empty group could not give us - pipelines, jobs,
  trace, JUnit summary, MRs with labels and a `belay-proof` note, diffs, deployments (one blocked on approval),
  releases, schedules, vulnerabilities, and file contents (policy files copied from `policy/`, a hash-chained
  ledger built with `schemas/ledger`). Their JSON shapes are recalled from the GitLab docs, not recorded.
- **Not verified live:** every write (builders are tested for exact argv only), the diffs endpoint,
  `glab api` flag behaviour for writes (`-f` fields), the Flows API route, and custom flows (GraphQL only).

## Notes from B6

- The `[R]` fixtures live in `__fixtures__/docs/`; the repository's `.gitignore` had `docs/`, which matched that folder and kept it out
  of commits (a clean checkout could not build). It is now `/docs/`.
- A fake tree entry's `id` and file `blob_id` are content hashes, like git blob ids: the ledger importer skips an unchanged file by it.

## Decisions from F38

- `createMr` takes an optional `removeSourceBranch`; when it is absent the argv is unchanged (`plan/builders.ts:32`, `plan/types.ts:18-19`).
- The fake knows branch heads and answers the branch read (`fake/reads.ts:102`, `fake/dataset.ts:27-28`). Like GitLab, it refuses
  `start_branch` onto an existing branch without `force` (`fake/writes.ts:21-25`).

## Gates

`npx tsc --noEmit`, `npx eslint src/server/gitlab cli`, `node scripts/check-structure.mjs src/server/gitlab`,
`npx vitest run src/server/gitlab`, `npm run doctor`.

## Decisions from the branch-aware fake

- The fake keeps a tree per branch (`fake/refs.ts`): the default branch is the project's own `files`; a write to any other
  branch forks it from `start_branch` and lands there, so main is unchanged until a merge. File, tree and commit reads
  honour `ref` / `ref_name`; an unknown branch answers 404.
- `PUT merge_requests/:iid/merge` (`fake/merge.ts`) is the only way a branch reaches its target: it fast-forwards the
  branch's changed files, answers 406 when the target's copy changed after the branch started, and deletes the branch
  when the MR asked for `remove_source_branch`. Tests call `mergeMr(gl, project, iid)` for "the person merges".

## Decisions from the doctor's blocker

- `probeCapabilities` reads the login, group, namespace, instance and projects first and keeps each error. `doctor/blocker.ts`
  names the first cause that stops every probe - glab cannot start (`binary`), GitLab cannot be reached (`network`), no
  login (`auth`), the group answers 403/404 to a signed-in user (`group`) - as `report.blocker {kind, text, fix}`. Then
  every row is unknown, basis none, "blocked by: ...", and no endpoint GET is sent. Any other failure (a 500, a 429) is
  not a blocker: the rows say unknown on their own.
- `doctor/render.ts` prints `BLOCKED  <text>` and `  fix: <command>` right after the local preflight, in place of the
  rows. Exit codes: 0 the probes answered, 2 every row unknown with no blocker, 3 blocked; `cli/belay.mjs` passes them on.
- Setup's doctor read (`src/server/data/setup/read.ts`) returns no rows and the blocker as its error, so SetupSummary shows
  "belay doctor: glab is not logged in to gitlab.com: run glab auth login".
