# GitLab side of Belay

What runs inside GitLab, and keeps running with Belay's laptop closed. Belay itself only reads these and writes on a person's
click. Inside GitLab, only belay-apply (`apply/`) writes. Module B4 of `docs/BACKEND-PLAN.md`. Nothing here has run on a live GitLab yet: it is written against the docs (each file's
header names the page for each construct) and tested against a fake `glab` and the real engine in `engine/`.

| Path | What | Lands |
|---|---|---|
| [`flows/patcher.yml`](flows/README.md) | Custom flow: exploit test, then patch, then an MR with claims (T1) | M1, 9 Oct |
| `flows/guardrail.yml` | Custom flow: cited-diff review of agent MRs, blocks with a quoted hunk (T4) | 12 Oct |
| `flows/medic.yml`, `flows/qa.yml`, `flows/cra.yml`, `flows/gardener.yml` | T5, T7, T2, T8 | 15-20 Oct |
| `flows/schemas/*.json` | JSON Schemas for what the flows write (checked in CI, since custom flows cannot enforce one) | with each flow |
| [`components/`](components/README.md) | the CI/CD Catalog project `belay-pack`: `templates/<name>/template.yml` and the Node glue in `scripts/` | M1 to M2 |
| `components/templates/proof-engine/` | the model-free re-derivation of every Proof Block, report-only in the target | M1 |
| `components/templates/tier-gate/` | reads `tier-state.yml` at MR time and runs the gate, report-only in the target | M1 |
| `components/templates/maturity-scan/` | scheduled facts collection and scoring (T6) | 7 Oct, full 21 Oct |
| [`apply/`](apply/README.md) | the `belay-apply` project: holds every write token and makes every write. Re-derives the proof, runs the gate (approve, auto-merge, wait, block), starts the guardrail, appends `belay-ledger`, and runs the tripwire for each target | M2, 12 and 16 Oct |
| `examples/target-project/` | a `.gitlab-ci.yml` wiring the components a target runs, and the `.gitlab/duo/agent-config.yml` template | bootstrap MR |
| `examples/belay-policy/` | the `belay-policy` project layout, its `CODEOWNERS` and settings | Setup step 9 |

## How the pieces meet

```
agent flow (LLM)    ->  branch + MR with trailers and a belay-claims block          claims, never a verdict
target pipeline     ->  belay-replay evidence; proof-engine and tier-gate report     job token only, no writes
belay-apply sweep   ->  reads the MR, diff, notes and the head's evidence with its own token
                        guardrail not run for this head?  ->  starts it (Flows API)
guardrail flow      ->  MR note: belay-guardrail block (head_sha, quoted hunks)
belay-apply sweep   ->  engine prove (no model, its own engine)  ->  MR note: belay-proof block + proof::* label
                    ->  engine gate over tier-state.yml  ->  approve | auto-merge | wait | block, labels
                    ->  engine ledger append  ->  belay-ledger/events/<project>.jsonl
belay-apply tripwire->  engine tripwire  ->  tier-state.yml commit to belay-policy (down only)
Belay (local)       ->  polls all of the above; writes only on a click
```

The target pipelines hold no write token: any job there, the agent's own tests included, could read one (F4). belay-apply
runs only its own config, from its protected branch, and trusts nothing a target pipeline computed. An MR that changes its
own CI configuration waits for a person (`apply/README.md`).

Contracts used (all from `docs/BACKEND-PLAN.md` section 3 unless noted): labels `proof::*`, `guardrail::*`, `belay::tier::*`;
the `belay-proof` fenced block and the `Belay-Task: <ulid>` trailer; `tier-state.yml` and `trust-policy.yml` in `belay-policy`;
the ledger at `events/<project-id>.jsonl`. **Added here** (the contract does not fix them): the `Belay-Class:` and `Belay-Finding:`
trailers, the `belay-guardrail`, `belay-claims` and `belay-medic` fenced blocks, and the tripwire event shape (taken from
`engine/decide/tripwire.ts`).

## Findings that change the plan (details in `flows/README.md`)

- A flow trigger needs a person to perform the action; bot and service-account actions do not fire it. So a patcher MR does not fire
  the guardrail. belay-apply starts it through the Flows API instead (spike S1 decides whether that works with a given token).
- A CI job token cannot post notes or labels, approve or merge. Those need a bot token, and any CI variable of a target
  pipeline is readable by every job in it, the agent's own included (F4). So the write tokens live on belay-apply only
  (decided 2026-10-07, ask 6696d24d; `components/README.md`, "Exposure").
- Custom flows cannot use `response_schema_id`, so flow JSON is validated after the fact in CI.

The flow YAML syntax is checked against the GitLab docs on the day each flow is written. Nothing here is written from memory;
what could not be checked is marked `[R?]` and listed in each README.
