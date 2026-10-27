# Afterlife - proof-carrying agents for the post-code lifecycle

> Agents may act alone only where they can prove it.

Afterlife is our entry for GitLab's **Life After Code** (Transcend) hackathon, Path A: Start Fresh. It puts AI agents,
built on the **GitLab Duo Agent Platform**, on the post-code lifecycle of GitLab projects (security fixes, review,
pipeline repair, QA, compliance, upgrades) and gives the person in charge one place to see what they did, why to
believe it, and what still needs a human.

**The problem.** Teams want agents past the merge button, but "the agent says it fixed it" is not evidence, and an
agent that may merge alone everywhere is a risk nobody signs off. Afterlife makes autonomy something an agent earns,
per kind of action, from checks it cannot fake, and loses on the first failure.

- **The Proof Block.** Every agent action ends in a Proof Block. A CI job with **no AI model in it** (`engine/`)
  re-derives each check: the exploit test was red at base and green at head, no test was weakened, the finding is
  gone on a rescan, the diff stays inside the policy's envelope. Claims come from the agent; only the checks decide.
- **Earned autonomy, per action class.** Each class (for example `dep-bump.patch`) sits at Assisted, Supervised or
  Hands-off (or Quarantined, or Human only). It climbs only through a person's policy MR, when its record clears the
  bar, and a **tripwire** drops it to Quarantined, automatically, on the first failure.
- **Writes are always yours.** The app writes to GitLab only when a person clicks, as that person, and shows the exact
  command first (the Outbox).

## How it uses GitLab

| Part | Where | What it is |
|---|---|---|
| Custom Duo flows | [`gitlab/flows/`](gitlab/flows/README.md) | Six flows: T1 exploit-proof patcher, T4 guardrail reviewer, T5 pipeline medic, T7 exploratory QA, T2 EU CRA autopilot, T8 upgrade gardener, triggered by GitLab events (pipeline status, mention, assign) |
| CI/CD components | [`gitlab/components/`](gitlab/components/README.md) | `proof-engine`, `tier-gate`, `maturity-scan`: report-only jobs a target project includes, running the model-free engine with `CI_JOB_TOKEN` only |
| Proof engine, tier gate, tripwire | [`engine/`](engine/README.md) | `prove`, `envelope`, `gate`, `tripwire`, hash-chained `ledger`, maturity `scan`; no network, no LLM |
| Policy as code | [`policy/`](policy) | `trust-policy.yml` (envelopes, rungs, ceilings) and `tier-state.yml` (where each class stands) |
| The app | `src/` | Reads the group, the pipelines and the ledger; stages writes for a person to run |
| Google Cloud | [`infra/cloudrun/`](infra/cloudrun/README.md) | The public, read-only hosted replay of the app on Cloud Run |

**What ran on GitLab** (the demo target project [`afterlife`](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/35338952/afterlife), a small Kotlin bank with seeded faults):

- The **patcher** and **guardrail** flows are registered in the AI Catalog
  ([patcher](https://gitlab.com/explore/ai-catalog/flows/1019957), [guardrail](https://gitlab.com/explore/ai-catalog/flows/1019958))
  and enabled on the project.
- The patcher took the seeded V-204 path traversal from an issue, wrote an exploit test, saw it fail, patched the code,
  saw the test pass and opened [MR !2](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/35338952/afterlife/-/merge_requests/2)
  with a green pipeline. A person merged it: this class is Supervised.
- The guardrail blocked the seeded poisoned
  [MR !1](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/35338952/afterlife/-/merge_requests/1) (a hidden
  "ignore previous rules" instruction and a weakened security job), quoting the instruction, and passed MR !2.
- [Pipelines](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/35338952/afterlife/-/pipelines), including
  the Duo Agent Platform sessions' own pipelines. The agent session pages need a signed-in GitLab account.

**Live app on Google Cloud:** https://afterlife-replay-731858830008.europe-west1.run.app (Cloud Run, read-only demo estate).

## The app

A local app (Next.js) in a macOS-style window. The menu is grouped in the order a person meets it, and the guided tour
(Shift+G, or the invitation at the top of the window) walks the same path over the real screens.

| Group | Screen | Answers |
|---|---|---|
| Start | Projects `/start` | Which projects does Afterlife know here, and for each: is this machine, my GitLab login and my group ready? Add a project. |
| | Setup `/setup` | What blocks each of the eight agents, in arm order, and what only I can do. |
| Watch | Fleet `/fleet` | Across all projects: who may act alone, what is stale, what needs me? |
| | Monitor `/monitor` | The estate as live leads, one per group: pick a project and act on what waits. |
| | Theater `/theater` | A deterministic replay of an agent's run, beat by beat, with present mode (`F`). |
| | Vitals `/vitals` | How a project does in production: CI time per variant, production signals with deploys, and which claimed improvements earned their credit. |
| Govern | Ladder `/ladder` | What may each agent do right now, and how do I take it away? |
| | Needs you `/needs-you` | What waits for me, and what will my click write? The CRA legal clock and the Outbox. |
| | Task `/task/[id]` | What did this agent do, and why may I believe it? The claims against the engine's checks. |
| Improve | Cycles `/cycles` | What has each improvement round earned, measured by a rescan? |
| | Maturity `/maturity` | Which DevSecOps stages are real (rung 0-4), and which gap do we close next? |
| | Runs `/runs` | The cycle runner's ledger: every lane, its wave, outcome, cost, and why a lane failed. |

Also: the front door `/` (the estate at a glance), `/about` (the loop as a short film), `/settings` (text size: Smaller
by default, Standard, Larger; Cmd/Ctrl `=` `-` `0`), and `/onboard/estate` (bringing a whole group in, a batch at a time).

The demo estate (`acme-lab`, 184 fictional projects; the deep demo project `ledgerline`) is illustrative and labelled so
on every screen; seeded faults are marked "seeded".

## The nine stages

| Stage | Covered by |
|---|---|
| plan | Issues the flows answer (findings, CRA reports); Maturity's proposed gaps |
| create | The patcher's branch and MR; the gardener's upgrade MRs |
| verify | The exploit test red at base and green at head; QA on staging; the medic on red pipelines |
| package | The demo project's build and image jobs |
| secure | SAST and dependency findings routed to the patcher; the guardrail reading agent MRs for hidden instructions |
| release | The tier gate's merge or wait; the staging to production promotion |
| configure | Cloud Run infrastructure as code; `agent-config.yml`; policy as code |
| monitor | Vitals' production signals; the ledger; Fleet and Monitor |
| govern | The trust policy, tier state, tripwire, the CRA clock, and the hash-chained ledger |

## Run it

```bash
npm install
npm run dev          # http://localhost:3000, the demo estate
npm run verify       # typecheck, lint, structure check, tests, production build
npm run doctor       # local preflight: git, glab, auth
npm run engine -- prove --class exploit-test --input engine/__fixtures__/exploit/input.pass.json      # a Proof Block, no model
npm run engine -- prove --class exploit-test --input engine/__fixtures__/exploit/input.weakened.json  # caught: a weakened test
```

Settings come from `AFTERLIFE_*` environment variables (or the runtime settings Projects saves), and local data lives
in `.afterlife/`. `AFTERLIFE_MODE=live` reads a real GitLab group through `glab`; the default is the demo estate.
(Renamed from Belay: `BELAY_*` variables and a `.belay/` folder are still read when the new names are absent.)

## Code layout

```
src/app/features/<screen>/    each screen: components/, hooks/, model/ (pure, tested), data/, README.md
src/components/               the shared macOS-style kit: shell (two-level sidebar), controls, table, status, overlays
src/server/                   GitLab reads, the poller, the live data source, actions
engine/                       the model-free proof engine, tier gate, tripwire and ledger (runs in CI)
gitlab/                       custom Duo flows, CI/CD components, belay-apply (the write side)
runner/  cli/                 the cycle runner (waves of agent lanes in git worktrees) and the afterlife CLI
policy/  skills/  infra/      trust policy templates, the adopt skill, Cloud Run deployment
```

Two rules apply to all code: a file is at most 200 lines and a folder holds at most 10 files
(`npm run check:structure`). The shared components are documented in `src/components/README.md`.

## Hackathon notes

- **Path A: Start Fresh.** Everything here was built from 5 October 2026 for this hackathon; see the commit history.
- **Declared autonomy: Supervised.** Agents act and prove; a person approves the outcome (the merge). The trust policy
  lets a class earn Hands-off from its record, and the app shows all three tiers and a tripwire demotion.
- **Not yet wired on GitLab:** the proof-engine and tier-gate CI components need the `belay-pack` and `belay-policy`
  projects, which are not created yet; the engine runs in this repository's own pipeline and by hand (above). The medic,
  QA, CRA and gardener flows are defined in `gitlab/flows/` but not registered.
- **Licence:** MIT, see [LICENSE](LICENSE).

## Licence

MIT. See [LICENSE](LICENSE).
