# engine - Belay's model-free proof engine, tier gate and tripwire

Runs in GitLab CI as `npx tsx engine/cli.ts <cmd>` (or `npm run engine -- <cmd>`). No network, no LLM, no
dependency beyond `yaml`. Every command writes JSON to stdout and a human summary to stderr. Exit codes:
**0** pass, **1** fail, **2** inconclusive or error (an error prints `{"error": "..."}`).

| Command | Does | Exit |
|---|---|---|
| `prove --class <ProofClass> --input <file.json> [--policy P] [--files-root D]` | Writes a `ProofBlock` | verdict: 0 / 1 / 2 |
| `envelope --policy P --class <id> --diff <file> [--env <name>]...` | Files, lines, denied paths, environments | 0 within, 1 outside |
| `gate --policy P --state S --class <id> --proof F --guardrail F [--agent A] [--diff F] [--env E] [--now T] [--engine-sha H] [--shadow-next-rung]` | `merge` / `approve` / `wait` / `block` (+ `would`) | 0 / 0 / 2 / 1 |
| `tripwire --policy P --state S --event F` | `{demote, commit: {path, content, message}}` | 0 (2 on bad input) |
| `ledger append --event F --chain events.jsonl [--write]` | One hash-chained ledger line | 0 (2 on a broken chain) |
| `ledger trial --chain events.jsonl --agent A --class C --since T [--through N] [--head H]` | `{verifies, head, trial}`: a holder's next-rung trial recomputed from the chain cut at seq N, anchored to head hash H (ledger-record's rule, no input JSON); the line a promotion MR prints | 0, 1 broken or not the named chain, 2 bad input |
| `scan --facts facts.json \| --dir <checkout> [--propose]` | `belay.maturity/0`. `--facts`: nine stage cells from the facts `collect-facts.mjs` wrote. `--dir`: the Day-0 read of a local checkout (`engine/scan`: its files and CI config, nothing read from GitLab), with the next change per stage under `--propose`; read-only | `--facts`: 0 all determined, 2 any unknown or unreadable input. `--dir`: 0, 2 when every stage is unknown or it is not a directory |
| `pin` | `{version, sha256, files}`: the engine pin every Proof Block carries and the files it covers | 0 (2 on an import it cannot follow) |

Policy defaults to `policy/trust-policy.yml`, state to `policy/tier-state.yml`. In a proof input,
`{"$file": "x.diff"}` is replaced by that file's text (relative to the input). The file must resolve, symlinks
followed, under the input's folder or `--files-root`, and not into a `.git` folder: the text is posted on the MR.
Only `prove` inlines; `gate`, `tripwire` and `ledger` read their JSON as it is.

## What each proof class proves

- **exploit-test** - the named test failed at base and its output names the vector (trimmed, at least 3 characters:
  a shorter one names no attack); the same test id passed at
  head; no test was weakened in the diff (assertions removed or loosened, skips, deleted tests, `assertTrue(true)`);
  the finding is gone on a rescan by the same scanner version; the diff is inside the envelope. Reads JUnit XML,
  or a raw job trace (Gradle, Surefire, pytest, go test, Jest/Vitest).
- **cited-diff** - every finding quotes text that literally sits in a hunk of the MR diff, compared after
  collapsing whitespace only, at least 6 characters, and across adjacent lines only (never added lines with others
  between them). It proves the quote exists, not that the finding reads it right. Diff text is data. `claims` must be a
  list: no findings is a vacuous pass, so a claim object where the list belongs is refused.
- **rerun-stats** - N reruns of one SHA, counts recomputed from the job records (cancelled and runner failures
  left out, one job counted once however many records repeat it): `flake` below the real-failure rate,
  `real-failure` at or above it. Thresholds come from a `rerun_stats` block in the policy, else the engine defaults
  (5 runs, 0.8), and the check says which.
- **linked-evidence** - every statement's link resolves in the resolution results the input carries (the engine
  never fetches), on an allowed host; CRA clock arithmetic is recomputed. Legal wording is a `decidedBy: human` check.
- **repro** - the failure the agent claims (`expect: {status?, assertion?}`) reproduces in at least 2 probe runs against
  the target `environment`, and every run names the MR head (`task.head_sha`, else `sha`). `runs` is the probe's JSON
  (`[{id, sha, environment, status?, failures?, error?, job_ref?}]`); a run whose probe broke (`error`) is left out.
- **bench-delta** - base and head JUnit (or traces): no case fails at head that did not fail at base, and every case
  that ran at base still runs at head; base and head `bench` JSON (`{runner_tag, benchmarks: [{name, value, unit?,
  better?}]}`) from the same runner tag: no benchmark is worse at head by more than `tolerance` (a fraction of base, from
  the input, else the engine default 0.05; the check says which). Different runner tags are not comparable: inconclusive.
- **score-delta** - base and head `belay.maturity/0` scans (what `scan` prints, parsed by `src/schemas/maturity.ts`) of
  the task's project by the same engine version: no stage's rung is lower at head. A stage unknown at both ends is
  unchanged; known at one end only, or another engine version, is inconclusive.
- **ledger-record** - a belay-ledger chain (`chain`: the `events/<id>.jsonl` text, inline or `$file`) verifies from
  genesis (`verifyChain`; a broken link fails, naming its seq), and the next rung's trial of a holder (`record: {agent,
  class, since}`) is recomputed from the chain alone with the poller's own rule (`src/schemas/trial.ts`): the MRs whose
  `tier_decision` states a `would` that acts alone, and their seq range. Optional `trial: {min, catches}`: the row must be
  met (a catch over the bound fails; short of `min` is inconclusive). What the chain cannot state stays unresolved: it
  holds no edit fact, close or revert, so a trial MR it shows merged is "no edit fact" and any other is "open"; the
  poller resolves those from GitLab. On a chain with no task rows beside it, the checker's row and the poller's agree
  (`src/server/poller/derive/__tests__/gate/chain.test.ts`). Fixtures in `__fixtures__/ledger`.

Evidence that is missing, unreadable or not comparable is an `ok: null` check (inconclusive), never a pass. repro,
bench-delta and score-delta read JSON evidence inline or as a `$file` (its text is parsed), ledger-record its chain
text, so a CI job writes them with `evidence_mode: provided`; fixtures in `__fixtures__/repro`, `bench`, `score`, `ledger`. No class is a stub any more
(`proofs/stubs.ts` keeps the inconclusive answer for one that is named before its checker exists).

The block's `verdict` is `verdictOf(checks, envelope.within)`: claims never decide. `engine` is
`{version, sha256}`, the hash of every source file the engine runs: the import closure of `engine/cli.ts`
(`core/imports.ts`), which takes in the rules it imports from `src/schemas` (`verdictOf`, the trial rule, the hash chain,
`demote`, the CRA clock) and leaves out tests, fixtures and any file nothing imports. An import it cannot resolve, an alias
(`@/x`) or a dynamic `import()` is an error, never a smaller pin. So a verdict pins its checker; `pin` prints the list.

## Maturity scan

`scan` reads a `belay.facts/0` file and prints `{schema: 'belay.maturity/0', project_id, engine_version, scanned_at, cells}`
(`src/schemas/maturity.ts`, which the server parses the artifact with). `scanned_at` is the facts' `at`: the engine reads no
clock, and "the last 14 days" count back from it. Each of the nine cells, in `STAGES` order, is `{stage, rung, evidence:
[{label, url}], note, next_rung}`, `rung` an index into `RUNGS` or null. The table is data (`commands/rubric.ts`):

| Stage | R1 present on the default branch | R2 ran in 14 days with an artifact | R3 failing it blocks a merge | R4 an agent operates it, Belay re-derives it |
|---|---|---|---|---|
| plan | `issue_templates`: a file under `.gitlab/issue_templates` | not read | not read | not read |
| create | `codeowners` has a file, or `protected_branches` holds the default branch | not read | not read | not read |
| verify | a `ci_config.jobs` name with the word test(s), lint, spec or check | that job on `latest_pipeline_jobs`, a `junit` artifact | rule R3 | rule R4, proof job `belay-proof-rerun-stats` |
| package | a job name with build, image, docker, kaniko, package or publish | that job, any artifact | rule R3 | not read |
| secure | a job name with sast, secret_detection, dependency_scanning, gemnasium, container_scanning, dast or sbom | that job, a `sast`, `secret_detection`, `dependency_scanning`, `container_scanning`, `dast` or `cyclonedx` artifact | rule R3 | rule R4, proof job `belay-proof-exploit-test` or `sbom-rederive` |
| release | a job name with release or openvex | that job, any artifact | rule R3 | not read |
| configure | a job name with deploy, terraform, tofu, apply or infra | that job, any artifact | rule R3 | not read |
| monitor | a job name with monitor, smoke, synthetic, uptime or alert(s) | that job, any artifact | not read | not read |
| govern | the job `belay-tier-gate` | that job, any artifact | rule R3 | rule R4, proof job `belay-tier-gate` |

- **R2** (every job stage): one of R1's jobs is on the latest green default-branch pipeline, `success` or `failed`, finished
  at most 14 days before `at`, with an artifact of the listed type (`trace` and `metadata`, a job's own log, never count).
  Evidence: the job's and the pipeline's `web_url`.
- **Rule R3**: `project.merge_requires_pipeline` is true and that job is not `allow_failure` in `ci_config.jobs`. Evidence:
  the project's merge-request settings. `[R?]` the job must also run in merge request pipelines to block one; the facts do
  not say which pipelines it runs in.
- **Rule R4**: `duo_agent_config` is true and the stage's Belay proof job ran on the same pipeline (as R2, any artifact).
  Evidence: `.gitlab/duo/agent-config.yml` and the proof job.

A rung counts only when every rung below it does, so R2 and up always rest on a run: presence is not behaviour. A rung marked
"not read" is never credited; the cell stops below it and its note says so. A fact that is `{error}`, or was not collected
(including a field the rubric needs, such as a job's `finished_at` in facts written before the collector kept it), leaves
the cell null with a note naming the fact, whatever rungs below it held: unknown is never absent. Every lit cell cites at
least one URL built from the facts (`project.web_url`, a job's or the pipeline's `web_url`). Fixtures:
`__fixtures__/maturity/` (an empty project, a configured job that never ran, a stale run and one with no artifact, an
unreadable fact, a deep project).

## Gate and tripwire

The gate fails closed. Effective tier is the lower of the recorded tier and the class ceiling (a lapsed
hands-off lease counts as supervised; `decide/standing.ts`). An unknown or `human_only` class, no tier record, or several
holders with no `--agent` gives `block`, as do quarantined and a guardrail block. A proof that failed, whose verdict does
not follow from its checks, of the wrong class, for a class that declares no proof class, made by another engine build
(`--engine-sha`), or made from a different diff than the one the gate measured (`--diff`: paths touched differ) gives
`block`, as does a change outside the envelope; an inconclusive or missing proof or guardrail gives `wait`. Then
hands-off `merge`, supervised `approve` (a human still merges), assisted `wait`. The tripwire only lowers a tier with `demote()`, edits `tier-state.yml` in place (comments kept), and never promotes.

`gate --shadow-next-rung` also prints `would: {tier, decision}`: `gate()` run a second time on the same inputs with a
copy of tier-state in which the holder's record stands one rung higher (`decide/shadow.ts`; the raised record carries no
lease). It is absent when there is no next rung: the record is at the top, the rung above is over the class ceiling, or
no agent holds a record. The decision, the reasons and the exit code are the real gate's; belay-apply stamps `would` on
the `tier_decision` and never applies it.

## Sustainability

D6: verification costs no model calls. Every check here is a parser, a string comparison or arithmetic, so
re-deriving a Proof Block takes milliseconds of CPU rather than an LLM-as-judge call per claim.

Fixtures live in `__fixtures__/` (`[R]`: Gradle JUnit and trace shapes are recalled, not recorded from a live runner).
Run `npx vitest run engine`.
