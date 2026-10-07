# proof-engine

Re-derives a Proof Block with the model-free Belay engine and posts it on the merge request. This is the job that
makes "the agent says it works" into "a checker with no model says it works".

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
6. With `BELAY_BOT_TOKEN`: posts the note (a fenced `belay-proof` block plus the `Belay-Task:` trailer) and sets
   `proof::pass|fail|inconclusive`. Without it the proof stays in the job artifact.
7. Exits with the engine's code: 0 pass, 1 fail, 2 inconclusive or error. Only a pass leaves the job green.

If the engine writes no proof (bad input, missing block), the label becomes `proof::inconclusive` and the note says so.
Classes with no real checker in the engine yet (`repro`, `bench-delta`, `score-delta`, `ledger-record`) exit 2.

## Needs

- CI variable `BELAY_BOT_TOKEN` (masked): a project or group access token of the bot account, scope `api`, to write notes and
  labels. **A CI job token cannot** ([S] docs.gitlab.com/ci/jobs/ci_job_token).
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
| `post` | boolean | `true` | Post the Proof Block note and the proof label (needs BELAY_BOT_TOKEN). |
| `post_merge` | boolean | `false` | Also re-derive on the default branch after merge; a red result is the tripwire's post_merge_proof_fail. Turn it on only when the evidence jobs also run on the default branch, or the missing evidence reads as a failure and demotes the agent. |
| `node_image` | string | `"node:22-bookworm"` | Needs git, curl and node 20+. The -slim image has no git. |
| `glab_version` | string | `"1.120.0"` |  |
| `glab_sha256` | string | `""` | Optional SHA-256 of the glab linux amd64 tarball; checked when set. |
| `runner_tags` | array | `[]` |  |

## Verify

- `[R?]` the glab release asset URL and archive layout used to install `glab`; if your runner image already has `glab`,
  the install step is skipped.
- `[R?]` `rules:variables` per matching rule is used to set `BELAY_PHASE` ([R]: docs.gitlab.com/ci/yaml/#rulesvariables).
