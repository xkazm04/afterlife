# GitLab side of Belay

What runs inside GitLab, and keeps running with Belay's laptop closed. Belay itself only reads
these and writes on a person's click.

| Path | What | Lands |
|---|---|---|
| `flows/patcher.yml` | Custom flow: exploit test, then patch (T1) | M1, 9 Oct |
| `flows/guardrail.yml` | Custom flow on MR-created: cited-diff review of agent MRs (T4) | 12 Oct |
| `flows/medic.yml`, `flows/qa.yml`, `flows/cra.yml`, `flows/gardener.yml` | T5, T7, T2, T8 | 15-20 Oct |
| `components/proof-engine/` | CI/CD component: the model-free re-derivation of every Proof Block | M1 |
| `components/tier-gate/` | Reads `tier-state.yml` at MR time; approves or waits | M2, 16 Oct |
| `components/tripwire/` | Demotes on revert, reopened finding, post-merge proof fail, red main, guardrail high | M2 |
| `components/maturity-scan/` | Scheduled stage x rung scan (T6) | 7 Oct, full 21 Oct |
| `.gitlab/duo/agent-config.yml` (in the target) | Flow image, setup script, `id_tokens`, network policy | bootstrap MR |

The flow YAML syntax is checked against the GitLab docs on the day each flow is written. Nothing
here is written from memory.
