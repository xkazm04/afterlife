# GitLab side of Belay

What runs inside GitLab, and keeps running with Belay's laptop closed. Belay itself only reads these and writes on a person's
click. Module B4 of `docs/BACKEND-PLAN.md`. Nothing here has run on a live GitLab yet: it is written against the docs (each file's
header names the page for each construct) and tested against a fake `glab` and the real engine in `engine/`.

| Path | What | Lands |
|---|---|---|
| [`flows/patcher.yml`](flows/README.md) | Custom flow: exploit test, then patch, then an MR with claims (T1) | M1, 9 Oct |
| `flows/guardrail.yml` | Custom flow: cited-diff review of agent MRs, blocks with a quoted hunk (T4) | 12 Oct |
| `flows/medic.yml`, `flows/qa.yml`, `flows/cra.yml`, `flows/gardener.yml` | T5, T7, T2, T8 | 15-20 Oct |
| `flows/schemas/*.json` | JSON Schemas for what the flows write (checked in CI, since custom flows cannot enforce one) | with each flow |
| [`components/`](components/README.md) | the CI/CD Catalog project `belay-pack`: `templates/<name>/template.yml` and the Node glue in `scripts/` | M1 to M2 |
| `components/templates/proof-engine/` | the model-free re-derivation of every Proof Block | M1 |
| `components/templates/tier-gate/` | reads `tier-state.yml` at MR time; approves, auto-merges or waits | M2, 16 Oct |
| `components/templates/tripwire/` | demotes on revert, reopened finding, post-merge proof fail, red main, guardrail high | M2 |
| `components/templates/maturity-scan/` | scheduled facts collection and scoring (T6) | 7 Oct, full 21 Oct |
| `components/templates/ledger-append/` | appends events to `belay-ledger` | M2 |
| `components/templates/flow-dispatch/` | starts a flow by API where a trigger cannot fire (see below) | with the guardrail |
| `examples/target-project/` | a `.gitlab-ci.yml` wiring every component, and the `.gitlab/duo/agent-config.yml` template | bootstrap MR |
| `examples/belay-policy/` | the `belay-policy` project layout, its `CODEOWNERS` and settings | Setup step 9 |

## How the pieces meet

```
agent flow (LLM)  ->  branch + MR with trailers and a belay-claims block          claims, never a verdict
guardrail flow    ->  MR note: belay-guardrail block (head_sha, quoted hunks)
proof-engine job  ->  engine prove (no model)  ->  MR note: belay-proof block + proof::* label
tier-gate job     ->  engine gate over tier-state.yml  ->  approve | auto-merge | wait | block
tripwire job      ->  engine tripwire  ->  tier-state.yml commit to belay-policy (down only)
ledger-append job ->  engine ledger append  ->  belay-ledger/events/<project>.jsonl
Belay (local)     ->  polls all of the above; writes only on a click
```

Contracts used (all from `docs/BACKEND-PLAN.md` section 3 unless noted): labels `proof::*`, `guardrail::*`, `belay::tier::*`;
the `belay-proof` fenced block and the `Belay-Task: <ulid>` trailer; `tier-state.yml` and `trust-policy.yml` in `belay-policy`;
the ledger at `events/<project-id>.jsonl`. **Added here** (the contract does not fix them): the `Belay-Class:` and `Belay-Finding:`
trailers, the `belay-guardrail`, `belay-claims` and `belay-medic` fenced blocks, and the tripwire event shape (taken from
`engine/decide/tripwire.ts`).

## Findings that change the plan (details in `flows/README.md`)

- A flow trigger needs a person to perform the action; bot and service-account actions do not fire it. So a patcher MR does not fire
  the guardrail. `flow-dispatch` starts it from a job instead (spike S1 decides whether that works with a given token).
- A CI job token cannot post notes or labels, approve or merge. Those need a bot token as a CI variable; the write tokens must be
  protected variables (`components/README.md`, "Exposure").
- Custom flows cannot use `response_schema_id`, so flow JSON is validated after the fact in CI.

The flow YAML syntax is checked against the GitLab docs on the day each flow is written. Nothing here is written from memory;
what could not be checked is marked `[R?]` and listed in each README.
