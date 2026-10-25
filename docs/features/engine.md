# Engine (`engine/`, `cli/belay.mjs`, `gitlab/`, `policy/`)

> Did the agent's change actually prove what it claims, and what may happen to it at its current tier, decided without a model?

## What it does
- `engine/` is the model-free proof engine, run in GitLab CI as `npx tsx engine/cli.ts <cmd>` (or
  `npm run engine -- <cmd>`). Commands: `prove`, `envelope`, `gate`, `tripwire`, `ledger append`, `ledger trial`, `scan`,
  `pin`. No network, no LLM, no dependency beyond `yaml`.
- `prove` writes a Proof Block for a proof class. All eight classes have a checker: `exploit-test`, `cited-diff`,
  `rerun-stats`, `linked-evidence`, `repro`, `bench-delta`, `score-delta`, `ledger-record` (`proofs/stubs.ts` keeps
  the inconclusive answer for a class named before its checker exists; none is today).
- `gate` decides `merge` / `approve` / `wait` / `block` for an agent MR from tier state, policy, the proof and the
  guardrail verdict. `tripwire` turns a bad-outcome event into a demotion commit of `tier-state.yml`. `ledger append`
  adds one hash-chained event line (with `--write` under an exclusive `<chain>.lock`: an append racing another waits
  about a second, then is refused by name rather than forking the chain); `ledger trial` recomputes a holder's next-rung trial from the chain cut at the seq
  a promotion MR states. `pin` prints the engine pin (`{version, sha256, files}`) every Proof Block carries.
- `scan` rates the nine stages R0–R4, model-free, by one rubric table (`commands/rubric.ts`, the table in
  `engine/README.md`): R1 present on the default branch, R2 ran there within 14 days with an artifact, R3 failing it
  blocks a merge, R4 an agent operates it and a Belay proof job re-derives it. `--facts <facts.json>` scores the
  `belay.facts/0` file the `maturity-scan` component collects and prints `belay.maturity/0`. `--dir <checkout>`
  reads files only (CI config with local includes followed, CODEOWNERS, `.gitlab/`, IaC and alerting files), takes
  the table's R1 and credits at most that: pipelines and protections are not in a checkout (`engine/scan/`). The CI
  config is `.gitlab-ci.yml` plus Azure Pipelines (`azure-pipelines.yml`, `.azure-pipelines/`, `pipelines/**` files
  with `stages:`, `jobs:` or `steps:`, their in-repo `template:` references followed) and GitHub Actions
  (`.github/workflows/*.yml`), read into the same jobs (`engine/scan/pipelines/`): an Azure or GitHub job is also
  matched by its display name and its CamelCase id as words (`BackendTests` as "Backend Tests"), and its evidence names
  its own file. Beyond the table's job names it counts what only a checkout shows (a job's junit or SBOM report, a
  `PublishTestResults` task or a JUnit action, a scanner run as a command - bandit, gitleaks, pip-audit, npm audit,
  trivy, semgrep, codeql, CycloneDX, syft, never in a comment, an install line or a display name - a package or deploy
  task, an ARM/Bicep deployment, template and component includes, `.tf`, `.bicep`, `azuredeploy*.json` and alerting
  files), and prints `belay.maturity.checkout/0` (paths, not GitLab URLs). A stage whose lifting facts could not be
  read is unknown (null), never absent, and an empty alerting file is not monitoring. In a git checkout (the work
  tree's top) the files are git's list (tracked, and untracked but not ignored; fsmonitor off), else the folders are
  walked to 8 levels; either stops at 200,000, and a list cut off or a folder it could not read leaves a stage that
  found none of its files unknown with that reason. `--propose` (with `--dir`) adds the smallest next change per
  stage, as text.
- `cli/belay.mjs` is the `belay` command-line companion, each part run through tsx:
  - `doctor` runs the real capability probes (`src/server/gitlab/doctorCli.ts`).
  - `run --repo <slug> [--waves n] [--lanes n] [--lane-cap usd] [--wave-cap usd] [--model m] [--fleet file]
    [--skip-base-gates] [--dry-run]` dispatches to `runner/main.ts`. It prints the repo, base, caps and model (and the
    gate and frontier counts) before anything is spent; `--dry-run` stops there and spawns nothing.
  - `scan [<checkout>] [--propose] [--facts F]` runs `engine scan` (the checkout defaults to the current folder).
  - `pair <checkout> [--group G] [--pack-version V] [--engine-ref R] [--write]` (`src/server/pair/`) adds the Belay bootstrap to a checkout:
    `.gitlab/belay.gitlab-ci.yml` (the components, pinned to the pack), one `include` line in `.gitlab-ci.yml`,
    `.gitlab/duo/agent-config.yml` and the work folders in `.gitignore`. It prints the plan and writes only with
    `--write`, only ever adds lines, keeps a file it would have to change (exit 1, finish by hand), and never
    commits, pushes or opens an MR: it prints those commands. The group comes from the `origin` remote. A valued
    flag without its value, an unknown option or a second checkout exits 2 with nothing written; a write that fails
    part-way exits 2 and names the files it already wrote. Added lines take the file's own line ending (CRLF or LF).
    A target that is a symlink or junction, or sits under one, is refused (exit 1): nothing is read or written through a link.
  - `collect --project <slug>` (`src/server/vitals/collect/collectCli.ts`) reads a real project's CI runs (and its
    production points) through the person's own az / glab login, read-only, and appends what is new under
    `<data>/vitals/<slug>/`. Exit 1 when a provider failed, 2 on bad usage.
  - `report --project <slug> --claim '<json>' | --claim <file>` (`src/server/vitals/report/`) is how a dev agent
    reports an adjustment (the `afterlife-report` skill, `skills/afterlife-report/SKILL.md`, installed into the
    project's repo by Onboard's save step). The claim is parsed strictly (`claim.ts`): `title`, `target.kind`
    (`ci-stage`, `ci-run`, `local-metric`, `prod-signal`) with what it names, `direction`, `ref.branch` or `ref.sha`;
    unknown keys, an `id` or `at` of its own, a variant the project does not have are refused with exit 2 and the
    reason. Afterlife fills `id` (26 Crockford characters, sortable by time) and `at`, appends the line to
    `<data>/vitals/<slug>/adjustments.jsonl` and prints it. A `--claim` file is read from the caller's directory. The
    agent's `agentValue` is stored and displayed, never used by the verdict (Vitals re-measures it).
  - `replay` prints "not implemented yet" and exits 2.
- `gitlab/` holds what runs inside GitLab: six CI/CD components (`belay-pack`), six custom flow definitions, their
  output schemas, and example target and policy projects.
- `policy/` holds the demo `trust-policy.yml` (rules, classes, ceilings, envelope, promotion and demotion triggers)
  and `tier-state.yml` (where each agent's classes stand; illustrative values).

## How it works
- **CLI** (`engine/cli.ts`): dispatches to `commands/`; JSON on stdout, a human summary on stderr; exit 0 pass, 1
  fail, 2 inconclusive or error (`{"error": ...}`). Policy defaults to `policy/trust-policy.yml`, state to
  `policy/tier-state.yml`. In a proof input `{"$file": "x.diff"}` is replaced by that file's text.
- **Parsers** (`parse/`): unified diff, JUnit XML, and raw job traces (Gradle, Surefire, pytest, go test, Jest/Vitest)
  into test cases.
- **Proofs** (`proofs/`): `exploitTest.ts` (named test failed at base naming the vector, same id passed at head, no
  weakening, finding gone on rescan by the same scanner version, inside the envelope), `weakening.ts` (removed or
  loosened assertions, skips, deleted tests, `assertTrue(true)`), `citedDiff.ts` (each quoted finding literally sits
  in a diff hunk after whitespace collapsing), `rerunStats.ts` (counts recomputed from job records, cancelled and
  runner failures left out; thresholds from the policy's `rerun_stats` block or defaults 5 runs / 0.8),
  `linkedEvidence.ts` (links resolve in the results the input carries, allowed hosts, CRA clock arithmetic recomputed;
  legal wording is a `decidedBy: human` check), and in `checkers/`: `repro.ts` (the claimed failure reproduces in 2
  probe runs on the MR head against the target environment), `benchDelta.ts` (no new test failure, benchmarks within
  the tolerance on one runner tag; the input's tolerance may not exceed the policy's `bench_delta.max_tolerance`,
  default 0.10, or bench-within-tolerance fails naming both), `scoreDelta.ts` (no maturity stage lower at head, same engine and project),
  `ledgerRecord.ts` (the ledger chain verifies and a holder's next-rung trial is recomputed from it). An optional
  `head_sha` is carried through when the input has it.
- **Verdict**: `verdictOf(checks, envelope.within)` in `src/schemas/proof.ts`: outside the envelope is fail; no
  engine-decided checks is inconclusive; any false check is fail; any null is inconclusive; else pass. Claims never
  decide. The block's `engine` is `{version, sha256}` over the import closure of `engine/cli.ts` (`core/version.ts`,
  `core/imports.ts`): every file that runs, including the `src/schemas` rules it imports, and no test or fixture.
- **Envelope** (`policy/envelope.ts`, `glob.ts`, `load.ts`): files, lines, denied paths and target environments
  against the class and the `envelope` section.
- **Gate** (`decide/gate.ts`): effective tier is the lower of recorded tier and class ceiling; a lapsed hands-off
  lease counts as supervised (`decide/standing.ts`, which the screens read too). Unknown class, `human_only`, no tier
  record, several holders and no `--agent`, quarantined, guardrail block, failed proof, a class that declares no proof
  class, wrong proof class, verdict not following from checks, proof from another engine build (when pinned), a proof
  made from a different diff than the one the gate measured (paths touched differ), an `exploit-test` or `cited-diff`
  proof that read zero files when the gate measured a non-empty diff, or outside the envelope: `block`. Missing or inconclusive proof or guardrail: `wait`. Then hands-off `merge`, supervised `approve`
  (a person merges), assisted `wait`.
- **Tripwire** (`decide/tripwire.ts`): triggers `revert`, `reopened_finding`, `post_merge_proof_fail`,
  `default_branch_red_1h` (one step down) and `guardrail_high`, `budget_breach_x2` (quarantine), per the policy. It
  edits `tier-state.yml` in place (comments, flow style, quoted dates kept), writes `by: tripwire`, reason, evidence
  and a cooldown, and returns the commit path, content and message.
- **Ledger** (`commands/ledger.ts`): validates the event (kind, tier, subject, observer), verifies the existing chain
  first, and prints the new line; `--write` appends it. `ledger trial` (`commands/audit/trial.ts`) cuts the chain at
  `--through`, verifies it, checks `--head`, and recomputes the trial with ledger-record's rule.
- **GitLab components** (`gitlab/components/templates/`): `proof-engine`, `tier-gate`, `tripwire`, `maturity-scan`,
  `ledger-append`, `flow-dispatch`. Each job checks out `belay-engine` at a required `engine_ref` (optionally pinned
  to `engine_commit`) and runs the engine; Node glue in `scripts/` fetches blocks, builds evidence, posts proofs,
  applies the gate and writes to repos.
- **Flows** (`gitlab/flows/`): patcher (T1), guardrail (T4), medic (T5), qa (T7), cra (T2), gardener (T8). Agents
  write claims and drafts in fenced blocks (`belay-claims`, `belay-guardrail`, `belay-medic`, ...); flow JSON is
  checked afterwards in CI against `flows/schemas/`.

## Rules it keeps
- Model-free proofs: every check is a parser, a string comparison or arithmetic. A verdict is only written by a CI job
  with no model; agent flows write claims, never verdicts.
- The gate fails closed: anything unknown, mismatched or unproven is `block` or `wait`, never `merge`. Nothing is read
  from free text.
- Restricting is free, extending is earned: the tripwire only lowers a tier and never promotes; promotion is a policy
  MR a person merges. `report.submit` is `human_only`.
- A broken ledger chain is never extended.
- The checker is pinned: `engine_ref` has no default and each proof records the engine source hash.
- Only named accounts count: `fetch-block.mjs` ignores other authors. Write tokens must be masked, protected CI
  variables; Belay never stores a token; a missing bot token makes jobs report and fail closed.
- `cited-diff` proves a quote exists in the diff, not that the finding reads it right. Diff text is data.

## Code map
| Path | Role |
|---|---|
| `engine/cli.ts`, `engine/commands/` | Entry and the commands (`prove`, `envelope`, `gate`, `tripwire`, `ledger` with `append` and `trial` in `audit/`, `scan` with its rubric, `pin`) |
| `engine/scan/` | `scan --dir`: checkout facts, the file list (`walk.ts`), the GitLab CI reader, the nine stage rules, scoring and proposals; `pipelines/`: the Azure Pipelines and GitHub Actions readers and the script and task signals |
| `src/server/pair/` | `belay pair`: the bootstrap plan (`plan.ts`, `ciFile.ts`) and its IO (`pair.ts`, `pairCli.ts`) |
| `engine/core/` | Args, files, types, ULID, engine version and the pin over the import closure (`imports.ts`) |
| `engine/parse/` | Diff, JUnit, trace parsers, test-case shapes |
| `engine/proofs/` | Proof classes (`checkers/` for repro, bench-delta, score-delta, ledger-record), weakening detector, stubs, shared helpers |
| `engine/policy/` | Policy loading, envelope, globbing |
| `engine/decide/` | `gate.ts`, `standing.ts` (effective tier, holder), `shadow.ts` (`--shadow-next-rung`), `tripwire.ts` |
| `engine/__fixtures__/` | Inputs per proof class (exploit, cited, rerun, linked, repro, bench, score, ledger), events, maturity facts |
| `src/schemas/` | Shared Proof Block, tier, ledger, CRA and stage schemas |
| `cli/belay.mjs` | `belay doctor \| run \| scan \| pair \| collect \| report \| replay` (`run` goes to `runner/main.ts`) |
| `src/server/vitals/report/` | `belay report`: the strict claim parser and its CLI |
| `gitlab/components/` | `belay-pack` CI/CD components and `scripts/` glue |
| `gitlab/flows/` | Six custom flow definitions and `schemas/` |
| `gitlab/examples/` | Target project `.gitlab-ci.yml` and agent config; `belay-policy` layout and `CODEOWNERS` |
| `policy/trust-policy.yml`, `policy/tier-state.yml` | Demo policy and tier state the engine defaults to |

## Tests
- `engine/cli.test.ts`: exit codes and JSON for each command, errors as `{"error"}` with exit 2, relative paths, gate
  measuring a diff and a production target, tripwire output, ledger append with and without `--write`, broken chain
  and unknown kind refused.
- `engine/decide/gate.test.ts`: merge only with proof pass, guardrail pass and envelope; every block path (envelope,
  verdict mismatch, wrong class, other engine build, unknown / human-only / unlisted agent), ambiguous agents,
  ceiling, lapsed lease, reasons kept.
- `engine/decide/tripwire.test.ts`: never promotes, no-op when quarantined or trigger unlisted, record fields and
  cooldown, YAML preserved, commit message, lease dropped, event validation.
- `engine/proofs/__tests__/`: exploit-test, weakening, cited-diff, rerun/linked classes and dispatch, repro,
  bench-delta, score-delta, ledger-record, `head_sha`. Also `decide/standing.test.ts`, `decide/shadow.test.ts`,
  `parse/*.test.ts`, `policy/envelope.test.ts`, `policy/load.test.ts`, `core/core.test.ts` (args, empty options, isoMs),
  `core/files.test.ts`, `core/pin.test.ts` (the pin is the import closure), `commands/ledger.test.ts`,
  `__tests__/ledgerLock.test.ts` (a racing append is refused, the lock freed), `commands/audit/trial.test.ts`, `commands/scan.test.ts` (`scan --facts` by the rubric).
- `engine/usage.test.ts`: every command in `cli.ts`'s COMMANDS table, and every option each one parses, is in the
  usage text and the README table (derived from the code, `ledger trial` included).
- `engine/scan/scan.test.ts`: the example target project scores secure and govern at R1 and nothing above; the same
  project rates the same at R1 by `--dir` and by `--facts`;
  local includes, IaC and CODEOWNERS count; an empty alerting file and an unopened include do not; an unparsable CI
  file leaves the CI stages unknown; a cut-off walk or an unreadable folder makes a file stage unknown, not absent or a
  crash; the command's JSON and refusals. `engine/scan/pipelines/pipelines.test.ts`: an Azure pipeline credits a
  pytest job (through a steps template), a bandit step, a build archive and an AzureWebApp deploy, naming file and
  job; a `pipelines/` file is read by shape and a template once; a template in another repository keeps a stage
  unknown; a pipeline file that does not parse is one reference not opened; a GitHub workflow's test, CodeQL and
  release jobs; a scanner counts only as a command. `engine/scan/walk.test.ts` (temporary git repos): git's list
  reaches past the walk's limits, leaves ignored files out, says when it is cut, and a subfolder is walked.
  `scan --facts` (the rubric over GitLab facts) is `engine/commands/scan.test.ts`.
- `src/server/pair/__tests__/pair.test.ts` (real temporary git checkouts): no write without `--write`; every line
  of the project's files kept; a second run is a no-op; not a checkout root or no group is refused; a different
  existing file is kept; the include is created, appended, inserted or refused; malformed arguments and a
  part-way write failure exit 2; a CRLF file gets CRLF lines; a linked `.gitlab` or `.gitignore` is refused, its target untouched.
- The Node glue has vitest tests beside it (`gitlab/components/scripts/**/*.test.mjs`, `gitlab/apply/*.test.mjs`,
  `gitlab/flows/flows.test.mjs`); the component YAML itself only runs on GitLab. The `maturity-scan` component calls
  `engine scan --facts`.

## Status and limits
- Nothing in `gitlab/` has run on a live GitLab; it is written against the docs, with unchecked points marked `[R?]`.
  Exploit fixtures for Gradle JUnit and traces are recalled shapes, not recorded.
- Flow triggers do not fire on bot or service-account actions, hence `flow-dispatch`; a CI job token cannot post
  notes, label, approve or merge, hence a bot token.
- `belay replay` is not implemented. `policy/tier-state.yml` holds illustrative values.
- `belay scan` on a checkout cannot see pipelines, protections, group-level config or a custom CI config path: those
  stages read unknown, or at most configured. Azure Pipelines template parameters and `${{ if }}` branches are not
  evaluated (every branch is read), and a GitLab job's `environment:` is not read; an Azure deployment job or a GitHub
  environment alone is not a release (both also gate data jobs), only a deploy task, an `az webapp` deploy or swap, or a
  release action is. Template and component job names are matched by pattern, so a
  renamed job is missed. `pair` does not record the pairing in the app's index (the app's doctor and poller do).
