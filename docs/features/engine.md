# Engine (`engine/`, `cli/belay.mjs`, `gitlab/`, `policy/`)

> Did the agent's change actually prove what it claims, and what may happen to it at its current tier, decided without a model?

## What it does
- `engine/` is the model-free proof engine, run in GitLab CI as `npx tsx engine/cli.ts <cmd>` (or
  `npm run engine -- <cmd>`). Commands: `prove`, `envelope`, `gate`, `tripwire`, `ledger append`. No network, no LLM, no dependency
  beyond `yaml`.
- `prove` writes a Proof Block for a proof class: `exploit-test`, `cited-diff`, `rerun-stats`, `linked-evidence` are
  implemented; `repro`, `bench-delta`, `score-delta`, `ledger-record` are stubs that return inconclusive.
- `gate` decides `merge` / `approve` / `wait` / `block` for an agent MR from tier state, policy, the proof and the
  guardrail verdict. `tripwire` turns a bad-outcome event into a demotion commit of `tier-state.yml`. `ledger append`
  adds one hash-chained event line.
- `cli/belay.mjs` is the `belay` command-line companion: `doctor` runs the real capability probes
  (`src/server/gitlab/doctorCli.ts` through tsx); `pair`, `scan` and `replay` print "not implemented yet" and exit 2.
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
  legal wording is a `decidedBy: human` check). An optional `head_sha` is carried through when the input has it.
- **Verdict**: `verdictOf(checks, envelope.within)` in `src/schemas/proof.ts`: outside the envelope is fail; no
  engine-decided checks is inconclusive; any false check is fail; any null is inconclusive; else pass. Claims never
  decide. The block's `engine` is `{version, sha256}` over every engine source file (`core/version.ts`).
- **Envelope** (`policy/envelope.ts`, `glob.ts`, `load.ts`): files, lines, denied paths and target environments
  against the class and the `envelope` section.
- **Gate** (`decide/gate.ts`): effective tier is the lower of recorded tier and class ceiling; a lapsed hands-off
  lease counts as supervised. Unknown class, `human_only`, no tier record, quarantined, guardrail block, failed proof,
  wrong proof class, verdict not following from checks, proof from another engine build (when pinned), or outside the
  envelope: `block`. Missing or inconclusive proof or guardrail: `wait`. Then hands-off `merge`, supervised `approve`
  (a person merges), assisted `wait`.
- **Tripwire** (`decide/tripwire.ts`): triggers `revert`, `reopened_finding`, `post_merge_proof_fail`,
  `default_branch_red_1h` (one step down) and `guardrail_high`, `budget_breach_x2` (quarantine), per the policy. It
  edits `tier-state.yml` in place (comments, flow style, quoted dates kept), writes `by: tripwire`, reason, evidence
  and a cooldown, and returns the commit path, content and message.
- **Ledger** (`commands/ledger.ts`): validates the event (kind, tier, subject, observer), verifies the existing chain
  first, and prints the new line; `--write` appends it.
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
| `engine/cli.ts`, `engine/commands/` | Entry and the five commands (`prove`, `envelope`, `gate`, `tripwire`, `ledger`) |
| `engine/core/` | Args, files, types, ULID, engine version and source hash |
| `engine/parse/` | Diff, JUnit, trace parsers, test-case shapes |
| `engine/proofs/` | Proof classes, weakening detector, stubs, shared helpers |
| `engine/policy/` | Policy loading, envelope, globbing |
| `engine/decide/` | `gate.ts`, `tripwire.ts` |
| `engine/__fixtures__/` | Exploit, cited, rerun, linked and event inputs |
| `src/schemas/` | Shared Proof Block, tier, ledger, CRA and stage schemas |
| `cli/belay.mjs` | `belay doctor | pair | scan | replay` |
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
- `engine/proofs/__tests__/`: exploit-test, weakening (24 cases), cited-diff, rerun/linked/stub classes, `head_sha`.
  Also `parse/*.test.ts`, `policy/envelope.test.ts`, `core/core.test.ts`.
- The GitLab components, scripts and flows have no automated tests in this repository (vitest covers `src/` and
  `engine/`).

## Status and limits
- Nothing in `gitlab/` has run on a live GitLab; it is written against the docs, with unchecked points marked `[R?]`.
  Exploit fixtures for Gradle JUnit and traces are recalled shapes, not recorded.
- `repro`, `bench-delta`, `score-delta`, `ledger-record` are stubs (inconclusive, exit 2), so QA and gardener proofs
  cannot pass yet.
- Flow triggers do not fire on bot or service-account actions, hence `flow-dispatch`; a CI job token cannot post
  notes, label, approve or merge, hence a bot token.
- `belay pair`, `scan` and `replay` are not implemented. `policy/tier-state.yml` holds illustrative values.
