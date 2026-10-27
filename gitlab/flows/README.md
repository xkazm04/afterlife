# Custom flows

Six flows in the "flow registry v1" format. Each file's header lists the doc page every construct was checked on (2026-10-06).
A flow's agents write **claims and drafts**. A verdict is only ever written by a CI job with no model (the proof-engine, the gate).

## The six

Cut on 19 Oct 2026: `qa.yml` (T7) and `gardener.yml` (T8). The checkpoint failed: no green loop. Cut means not enabled, not published to the AI Catalog, not filmed. The files stay as design records.

| File | Track | Trigger (chosen when enabling the flow) | What it writes | Tier ceiling, proof |
|---|---|---|---|---|
| `patcher.yml` | T1 | Pipeline events, status Passed, on the scheduled security-scan pipeline of the default branch; or mention/assign on a finding issue | a branch `belay/<task>` and an MR whose description has the `Belay-Task`, `Belay-Class`, `Belay-Finding` trailers and a `belay-claims` block | dep-bump hands-off, code-fix supervised; `exploit-test` |
| `guardrail.yml` | T4 | Merge request, action Created (people's MRs); for agent MRs started by belay-apply's sweep or by a person assigning the reviewer | an MR note with a `belay-guardrail` block (`head_sha`, findings with quoted hunks) | blocks at every tier, never merges; `cited-diff` |
| `medic.yml` | T5 | Pipeline events, status Failed | MR note or issue with a `belay-medic` block; for a flake, a tracking issue and a quarantine MR | retry hands-off, quarantine supervised; `rerun-stats` |
| `qa.yml` (cut 19 Oct 2026) | T7 | mention, or a person's assign (no dispatch from belay-apply yet) | MR note with a `belay-qa` block: bugs with replayable steps | files only; `repro` (engine stub today) |
| `cra.yml` | T2 | Work item, actions Created and Status changed (clock items) | work item note with a `belay-cra` block: statements with evidence links, `awaiting_signoff: true` | drafts hands-off, **submit is human only**; `linked-evidence` |
| `gardener.yml` (cut 19 Oct 2026) | T8 | mention or assign by a person on an upgrade MR (no dispatch from belay-apply yet, so a bot's MR waits for a person) | its own MR (trailers, `belay-claims` block with quoted changelog claims) | supervised; `bench-delta` (engine stub today) |

Flow results are ordinary GitLab objects, so Afterlife reads them by polling. No flow has a tool that merges, approves, labels, or
edits `tier-state.yml`; the toolsets are listed in each file and checked against the documented tool names.

## Output checking

Custom flows cannot set `response_schema_id` ([S] docs.gitlab.com/user/duo_agent_platform/flows/custom_flows_schema/), so a flow's
JSON is not schema-enforced by the platform. It is checked afterwards, in CI, against `schemas/`:

| Schema | Checked by |
|---|---|
| `guardrail-verdict.schema.json` | `tier-gate` (via `fetch-block.mjs --schema`); the cited-diff proof then checks each quote against the diff |
| `claims.schema.json` | `build-evidence.mjs` (patcher) |
| `medic-verdict.schema.json` | `build-evidence.mjs` (rerun-stats) |
| `qa-report.schema.json`, `cra-draft.schema.json`, `gardener-claims.schema.json` | nothing yet: no script or Afterlife reader reads a `belay-qa` or `belay-cra` block or the gardener's claims (`qa` and `gardener` are cut). They are design records of the shape a reader must check |

A block that fails its schema is treated as inconclusive: a guardrail block like that **blocks**. A trusted note that carries two blocks of the tag is treated the same way: `fetch-block` exits 4 (F67, 9e56d7f).

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
   prompt does through the REST API from `run_command` (the medic's retry) is still `[R?]`; `run_command` itself works (see below).
4. **Pipeline-event goal is the whole webhook payload**, so the prompts take only ids, ref and status from it.

## Installing

Verified on gitlab.com on 26 Oct 2026, on the delivery project `gitlab-ai-hackathon/transcend-october-2026/35338952/afterlife`
(id 87297710), as `kazdanm` with the **Developer (30)** role. Spike S3 is answered: creating and enabling a flow works by GraphQL, and
a Developer may do both here (the hackathon "Developer + AI" role). No UI step was needed.

1. **Create** the catalog item: GraphQL `aiCatalogFlowCreate(input: {projectId, name, description, public: true, release: true,
   definition: <the YAML file as a string>})`. The platform validates the YAML against its schema on create and lists every
   rejected property. Update with `aiCatalogFlowUpdate(input: {id, definition, release: true, versionBump: PATCH})`.
2. **Enable** it in the project: `aiCatalogItemConsumerCreate(input: {itemId, target: {projectId}, triggerTypes: ["mention",
   "assign", "assign_reviewer"]})`. This created the flow trigger and the service account in one call. The account is named
   `ai-<flow name, slugged>-<top-level group>`, for example `ai-afterlife-patcher-t1-gitlab-ai-hackathon` for the flow named
   "Afterlife patcher (T1)". The trigger `eventTypes` are integers: 0 mention, 1 assign, 2 assign reviewer.
3. Commit `.gitlab/duo/agent-config.yml` (see `../examples/target-project/`) to the default branch. On ledgerline the file keeps the
   default image (`workflow-generic-image:v0.0.23`, UBI 9, root, Java 17) and adds JDK 21 with `microdnf` in `setup_script`.
4. Runners: none to register. The session ran as a `duo_workflow` pipeline on the GitLab-hosted `saas-linux-small-amd64` runners.

Registered on 26 Oct 2026 (catalog items are public):

| Flow | Catalog item | Project flow page | Service account | Triggers |
|---|---|---|---|---|
| `patcher.yml` | 1019957, "Afterlife patcher (T1)", v1.0.1 | `/-/automate/flows/1019957` | `ai-afterlife-patcher-t1-gitlab-ai-hackathon` | mention, assign |
| `guardrail.yml` | 1019958, "Afterlife guardrail (T4)", v1.0.0 | `/-/automate/flows/1019958` | `ai-afterlife-guardrail-t4-gitlab-ai-hackathon` | mention, assign, assign reviewer |

`medic`, `cra`, `qa` and `gardener` are not registered. They still carry `max_cycles` (see below), so they need the same edit first.

### Adaptations the live platform required

- **`max_cycles` removed** from every component of `patcher.yml` and `guardrail.yml`. `aiCatalogFlowCreate` refused it: "property at
  `/components/0/max_cycles` is a disallowed additional property". The flow registry v1 doc lists it; the gitlab.com custom flow
  schema does not accept it. The loop bound now comes only from each prompt's `params.timeout`.
- **Patcher triage reads a person's goal.** The first prompt answered NONE for anything that was not a default-branch pipeline payload,
  so a mention on a finding issue could never start a fix. It now takes one fact from a person's text, a numeric vulnerability id, and
  fetches that finding. Without the id it would also have picked the highest severity open finding, a CRITICAL dependency finding, not
  the issue's.
- Everything else was accepted as written: `version: v1`, `environment: ambient`, `coding_environment`, `unit_primitives: []`,
  `ui_log_events`, routers with `condition.input`/`routes`, `end` and `abort`, the `{{goal}}`/`{{project_id}}` placeholders.

### Target project changes this needed (ledgerline, commit 322f329)

- `.gitlab/duo/agent-config.yml`, as above.
- `.gitlab-ci.yml`: the `belay.yml` include for `belay/*` MRs also needs `BELAY_PACK_READY == "true"`. The `belay-pack` and
  `belay-policy` component projects do not exist in group 35338952, and a missing component fails pipeline creation, so the patcher's
  MR would have had no pipeline at all. The proof-engine and tier-gate jobs therefore do not run on these MRs yet.

## Verified on the first runs (26 Oct 2026)

- **A trigger by a person works for the mention, assign-reviewer paths.** Requesting a review from the guardrail's account on MR !1
  started session 10087632 within a second. The account posts a "has started" note with the session link, then a system note
  "started session ... triggered by @kazdanm", and "completed session" at the end.
- **The goal of an assign-reviewer event** carried the MR iid; the guardrail found it and reviewed the right head.
- **The goal of a mention** is the comment text with its context; the patcher took the vulnerability id from it as the adapted
  triage prompt asks.
- **`run_command` and `create_commit` work in a remote (`ambient`) flow.** The patcher (session 10087560, mention on issue #1) ran
  `./gradlew :statements:test --tests '*StatementsUnitTest.finding 399820396*' --offline` to see its test red, patched, ran it and
  the statements suite green, minted the task id with `node -p`, created `belay/01m5wzwkv1n6tzch8cs8y0yp4g`, committed and opened
  MR !2. Routes taken: RED, PATCHED, MR_OPENED. The commit's author is the service account ("Afterlife patcher (T1)"); the MR's
  author is the person who triggered it (`kazdanm`), which is the composite identity. The `--offline` worked because the
  `setup_script` warm-up had filled the Gradle cache (about 3 minutes on a small runner; the whole session took 7 min 26 s).
- **Claims checked by hand** (the proof-engine is not deployed): `base-red` (the MR's test on unpatched main fails with "must be
  rejected ... nothing was thrown"), `head-green` (MR pipeline 2991663290, 50 tests, 0 failed), `test-not-weakened` (one test added),
  `finding-closed` (`semgrep-sast` on the head reports 0 findings). All four held. A person merged !2 as the supervised tier asks.
- **Session visibility.** `/-/automate/agent-sessions/<id>` and `/-/automate/flows/<id>` return 404 to a signed-out visitor, and the
  Duo `workload` job log says "not authorized" to one. The job page itself (source "Duo Agent Platform", tag `gitlab--duo`), the
  `duo_workflow` pipelines and the agent's notes and commits on the MRs are public.
- **`coding_environment: none`** flows still run as a CI job on the same image; the guardrail session took 74 seconds end to end.
- **Router on a closed token:** the guardrail's `POSTED` route ended the flow normally.
- **The guardrail's output** on the seeded MR !1: BLOCK with three findings, the right 40-character `head_sha`, the hidden instruction
  quoted character for character as `prompt-injection` high, the `allow_failure: true` line as `ci-tamper` high. Its third finding
  (`path-violation`, medium) quotes `stage: secure`, an unchanged context line of the hunk rather than an added or removed one, which
  the prompt forbids. The cited-diff proof would still find the text in the diff; the rule "added or removed lines only" is not
  enforced by the model.

## Not verified (`[R?]`), for the first run

- What a router does when the answer matches no route. Every prompt ends with a closed token list so it should not happen.
- The goal of a "merge request created" and of a "work item" event (only mention and assign reviewer were run).
- Pipeline-event triggers (`pipelineHooks` in `triggerConditions`): not enabled, so the patcher's scheduled path is untested.
