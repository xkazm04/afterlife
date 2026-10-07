# proof-engine

Re-derives a Proof Block with the model-free Belay engine, in the target's own pipeline, report-only: the proof is the job's
artifact and its exit code. The note on the MR comes from [belay-apply](../../../apply/README.md). It re-derives the proof
with its own pinned engine from the same evidence and never posts this job's `proof.json`, because a target pipeline holds
no write token (F4, decided 2026-10-07, ask 6696d24d). This is the job that makes "the agent says it works" into "a checker
with no model says it works".

**Job:** `belay-proof-<class>` (one include per proof class). **Stage:** `test` by default (set it after the jobs that
produce the evidence). **Runs:** on merge request pipelines, and on default-branch pipelines after merge.

## Include

```yaml
include:
  - component: $CI_SERVER_FQDN/acme/belay-pack/proof-engine@1.0.0
    inputs:
      class: exploit-test
      engine_ref: v0.1.0                       # required: tag, branch or SHA of the Belay repo
      engine_commit: '<40-char sha of that tag>'
      build_args: >-
        --base-junit evidence/base/junit.xml --head-junit evidence/head/junit.xml
        --rescan-base evidence/base/scan.json --rescan-head evidence/head/scan.json
```

## What it does

1. Fetches the Belay repo at `engine_ref` (and checks `engine_commit` if set), runs `npm ci`, installs `glab`.
2. `mr-context.mjs` reads the MR. It continues only if the author starts with `agent_prefix` and the description has a
   valid `Belay-Task: <ulid>` trailer. Otherwise it exits 0 with a message: a person's MR is not proven.
3. Clones `belay-policy` at `policy_ref` (read through the job token) and takes the MR diff.
4. Builds the `prove` input (`evidence_mode: auto`): `exploit-test` from the `belay-claims` block in the MR description plus
   the JUnit files named in `build_args`; `cited-diff` from the newest `belay-guardrail` block by the guardrail account
   for this head SHA; `rerun-stats` from the `belay-medic` block plus the jobs API. With `evidence_mode: provided` it uses
   `evidence_file` as it is.
5. Runs `npx tsx engine/cli.ts prove --class <class> --input ... --policy ... --files-root "$CI_PROJECT_DIR"` and keeps
   `.belay/proof.json`. A `$file` in the input may only name a file under the project folder, outside any `.git` folder.
6. Keeps the proof in the job artifact. It posts nothing: the job runs with `CI_JOB_TOKEN` only, which cannot write notes or
   labels ([S] docs.gitlab.com/ci/jobs/ci_job_token). The `post` input is gone.
7. Exits with the engine's code: 0 pass, 1 fail, 2 inconclusive or error. Only a pass leaves the job green.

Classes with no real checker in the engine yet (`repro`, `bench-delta`, `score-delta`, `ledger-record`) exit 2.
`rerun-stats` reads the pipelines and jobs API, which a job token cannot, so a target leaves that class to belay-apply. So
does `post_merge`: finding the merged MR of a commit (`repository/commits/:sha/merge_requests`) is not on the job token's list.

## Needs

- No Belay token. The job logs `glab` in with `CI_JOB_TOKEN` and unsets `GITLAB_TOKEN` first, whatever the project's
  variables say.
- The `belay-engine` and `belay-policy` projects must allowlist this project in their job token settings.
- `GIT_DEPTH: 0` is set for the job so the base commit is present.

## Inputs

| Input | Type | Default | Meaning |
|---|---|---|---|
| `stage` | string | `"test"` | Run after the jobs that produce the evidence (their artifacts are passed on by stage order). |
| `class` | string | **required** | The proof class to derive (src/schemas/proof.ts). One include per class. One of `exploit-test`, `cited-diff`, `rerun-stats`, `repro`, `bench-delta`, `linked-evidence`, `score-delta`, `ledger-record`. |
| `engine_ref` | string | **required** | Tag, branch or full SHA of the Belay engine to run. Required, so the checker is always pinned. |
| `engine_commit` | string | `""` | Optional 40-char SHA the checkout must resolve to. Set it when engine_ref is a tag or branch. |
| `engine_project` | string | `"$CI_PROJECT_NAMESPACE/belay-engine"` | Project path holding the Belay repo (engine/, src/schemas, gitlab/). Must allowlist this project's job token. |
| `policy_project` | string | `"$CI_PROJECT_NAMESPACE/belay-policy"` |  |
| `policy_ref` | string | `"main"` |  |
| `agent_prefix` | string | `"ai-"` | Only MRs from accounts with this prefix and a Belay-Task trailer are proven; others are skipped. |
| `evidence_mode` | string | `"auto"` | auto builds the prove input with scripts/proof/build-evidence.mjs (exploit-test, cited-diff, rerun-stats). provided uses evidence_file as an earlier job or prepare_script wrote it. One of `auto`, `provided`. |
| `evidence_file` | string | `"belay-evidence.json"` | Only for evidence_mode provided. The `prove --input` file, relative to the project root. |
| `build_args` | string | `""` | Extra arguments for build-evidence.mjs, e.g. for exploit-test "--base-junit base/junit.xml --head-junit head/junit.xml --base-ref URL --head-ref URL --rescan-base base/scan.json --rescan-head head/scan.json". |
| `block_authors` | string | `""` | Accounts whose belay-guardrail / belay-medic block counts. Empty means ai-guardrail-<group> or ai-medic-<group>. [R?] the exact ai-<flow>-<group> username form. |
| `prepare_script` | string | `""` | Optional shell run before the evidence is built. Sees BELAY_MR_IID, BELAY_TASK_ID, BELAY_ACTION_CLASS, BELAY_AGENT, BELAY_BASE_SHA, BELAY_HEAD_SHA, BELAY_DIFF_FILE, BELAY_POLICY_FILE, BELAY_PHASE. |
| `post_merge` | boolean | `false` | Also re-derive on the default branch after merge; a red result is the tripwire's post_merge_proof_fail. Turn it on only when the evidence jobs also run on the default branch, or the missing evidence reads as a failure and demotes the agent. |
| `node_image` | string | `"node:22-bookworm"` | Needs git, curl and node 20+. The -slim image has no git. |
| `glab_version` | string | `"1.120.0"` |  |
| `glab_sha256` | string | `""` | Optional SHA-256 of the glab linux amd64 tarball; checked when set. |
| `runner_tags` | array | `[]` |  |

## Verify

- `[R?]` the glab release asset URL and archive layout used to install `glab`; if your runner image already has `glab`,
  the install step is skipped.
- `[R?]` `rules:variables` per matching rule is used to set `BELAY_PHASE` ([R]: docs.gitlab.com/ci/yaml/#rulesvariables).
