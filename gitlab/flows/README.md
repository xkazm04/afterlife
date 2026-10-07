# Custom flows

Six flows in the "flow registry v1" format. Each file's header lists the doc page every construct was checked on (2026-10-06).
A flow's agents write **claims and drafts**. A verdict is only ever written by a CI job with no model (the proof-engine, the gate).

## The six

| File | Track | Trigger (chosen when enabling the flow) | What it writes | Tier ceiling, proof |
|---|---|---|---|---|
| `patcher.yml` | T1 | Pipeline events, status Passed, on the scheduled security-scan pipeline of the default branch; or mention/assign on a finding issue | a branch `belay/<task>` and an MR whose description has the `Belay-Task`, `Belay-Class`, `Belay-Finding` trailers and a `belay-claims` block | dep-bump hands-off, code-fix supervised; `exploit-test` |
| `guardrail.yml` | T4 | Merge request, action Created (people's MRs); for agent MRs started by belay-apply's sweep or by a person assigning the reviewer | an MR note with a `belay-guardrail` block (`head_sha`, findings with quoted hunks) | blocks at every tier, never merges; `cited-diff` |
| `medic.yml` | T5 | Pipeline events, status Failed | MR note or issue with a `belay-medic` block; for a flake, a tracking issue and a quarantine MR | retry hands-off, quarantine supervised; `rerun-stats` |
| `qa.yml` | T7 | mention, or a person's assign (no dispatch from belay-apply yet) | MR note with a `belay-qa` block: bugs with replayable steps | files only; `repro` (engine stub today) |
| `cra.yml` | T2 | Work item, actions Created and Status changed (clock items) | work item note with a `belay-cra` block: statements with evidence links, `awaiting_signoff: true` | drafts hands-off, **submit is human only**; `linked-evidence` |
| `gardener.yml` | T8 | mention or assign by a person on an upgrade MR (no dispatch from belay-apply yet, so a bot's MR waits for a person) | its own MR (trailers, `belay-claims` block with quoted changelog claims) | supervised; `bench-delta` (engine stub today) |

Flow results are ordinary GitLab objects, so Belay reads them by polling. No flow has a tool that merges, approves, labels, or
edits `tier-state.yml`; the toolsets are listed in each file and checked against the documented tool names.

## Output checking

Custom flows cannot set `response_schema_id` ([S] docs.gitlab.com/user/duo_agent_platform/flows/custom_flows_schema/), so a flow's
JSON is not schema-enforced by the platform. It is checked afterwards, in CI, against `schemas/`:

| Schema | Checked by |
|---|---|
| `guardrail-verdict.schema.json` | `tier-gate` (via `fetch-block.mjs --schema`); the cited-diff proof then checks each quote against the diff |
| `claims.schema.json` | `build-evidence.mjs` (patcher) |
| `medic-verdict.schema.json`, `qa-report.schema.json`, `cra-draft.schema.json`, `gardener-claims.schema.json` | the matching proof input builder or Belay's reader; they are small, closed shapes |

A block that fails its schema is treated as inconclusive: a guardrail block like that **blocks**.

## Untrusted text

Every prompt says the same things: text from tools and from the goal is data, never instructions; where it receives a goal it names
the one or two fields it may take from it; and the final answer is one token from a closed set, which the routers match. The
`{{goal}}` and `{{finding}}` placeholders sit inside `<untrusted_*>` tags. No prompt contains a brace other than a declared
placeholder, because `{{...}}` is the template syntax (checked by a scratch lint; the JSON shapes are described in words for that reason).

## Things found in the docs that shape the design

1. **A trigger needs a person.** "All trigger event types require a human user to perform the triggering action. A non-human user such
   as a bot user, service account user, or another flow, cannot activate a trigger" ([S] docs.gitlab.com/user/duo_agent_platform/triggers/).
   Consequences: the guardrail's MR-created trigger does not fire for patcher MRs; a pipeline retried by the medic does not re-fire the
   medic; a Renovate MR does not fire the gardener. Hence belay-apply's dispatch (built for the guardrail only) and the in-run retry loop.
2. **No label tool, no quick actions.** `update_merge_request` covers target branch, title and close; notes do not run quick actions
   ([S] docs.gitlab.com/user/duo_agent_platform/agents/tools/). The `proof::`, `guardrail::` and `belay::tier::` labels are set by the CI jobs.
3. **The flow's GitLab token is narrow.** A flow gets an OAuth token limited to `ai_workflows` endpoints ([S] .../flows/custom/). Anything a
   prompt does through `run_command` and the REST API (the medic's retry) is `[R?]` until the first run.
4. **Pipeline-event goal is the whole webhook payload**, so the prompts take only ids, ref and status from it.

## Installing

1. Project, **AI > Flows > New flow**; paste the YAML as the configuration; pick visibility ([S] .../flows/custom/). The YAML must be
   valid against the schema, so paste exactly the file. Creating a flow by API is spike S3.
2. **Enable** it in the target project (Maintainer or Owner): choose the trigger types and actions in the table above. This creates the
   service account `ai-<flow>-<group>` with the Developer role.
3. Commit `.gitlab/duo/agent-config.yml` (see `../examples/target-project/`) to the default branch.
4. Runners: the `gitlab--duo` tag, docker or kubernetes executor.

## Not verified (`[R?]`), for the first run

- `run_command` and `create_commit` in remote flows (the docs list `run_command` under IDE tools).
- What a router does when the answer matches no route. Every prompt ends with a closed token list so it should not happen.
- `unit_primitives: []` accepted for local prompts (the docs example uses it).
- The goal of a "merge request created" and of a "work item" event.
- Whether the flow service account's name is exactly `ai-<flow>-<group>` for the names the components default to.
