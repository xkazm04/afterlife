# Belay - proof-carrying agents for the post-code lifecycle

> Agents may act alone only where they can prove it.

Belay is our entry for GitLab's **Life After Code** hackathon. It is a local app that sets up
eight AI agents on GitLab projects and watches them. The agents handle what comes after code:
security, review, testing, compliance, releases and upgrades.

- **The Proof Block.** Every agent action ends in a Proof Block, which a job with no AI model in
  it re-derives. Claims come from the agent and checks come from the engine; only the checks
  decide.
- **Earned autonomy.** Autonomy is earned per action class from those proofs, through Assisted,
  Supervised and Hands-off. A tripwire removes it on the first failure.
- **Writes are always yours.** Belay writes only when a person clicks, as that person, and shows
  the exact command first.

**Status.** The UI runs end to end on illustrative demo data: 184 projects and one deep demo
project, `ledgerline`. The GitLab flows, the proof engine and the tripwire come next.

## Screens

| Route | Screen | Answers |
|---|---|---|
| `/` | Front door | The fleet as a city at night: how many decisions wait, and where? Enter Afterlife goes to Fleet. |
| `/fleet` | Fleet | Across all projects: who may act alone, what is stale, what needs me? |
| `/monitor` | Monitor | The fleet as seven phosphor leads, every project a beat: pick one and act on what waits. |
| `/needs-you` | Needs you | What is waiting for me, and what will my click do? Includes the CRA legal clock and the outbox. |
| `/ladder` | Ladder | What may each agent do right now, and how do I take it away? |
| `/maturity` | Maturity | Which DevSecOps stages are real, and which gap do we close next? |
| `/cycles` | Cycles | What has each improvement round earned, does the history add up to the scan, and what runs next? |
| `/task/[id]` | Task | What did this agent do, and why may I believe it? Shows the claims against the checks. |
| `/onboard` | Onboard | How far is the estate onboarded, what runs in the next batch, and what only I can do? |
| `/setup` | Setup | What blocks each track, and what only I can do. |
| `/theater` | Theater | Deterministic replay for recording, with present mode (`F`). |
| `/settings` | Settings | Text size: Smaller, Standard or Larger. ⌘= / ⌘- / ⌘0 change it. |

## Run

```bash
npm install
npm run dev        # http://localhost:3000, demo data
npm run verify     # typecheck, lint, structure check, tests, production build
npm run doctor     # local preflight: git, glab, auth
npm run demo:data  # regenerate src/lib/demo/data/belay-demo.json
npm run smoke      # with the app running: every route x 3 widths x 3 text sizes, no errors, nothing clipped
```

## Code layout

```
src/app/<route>/page.tsx      server route: loads demo data, renders one screen
src/app/features/<screen>/    the screen: components/, hooks/, model/ (pure, tested), data/
src/components/               shared macOS-style kit: shell, controls, overlays, table, status, viz, inspector
src/lib/                      demo data access, settings (text size), keyboard, formatting
src/styles/                   palette tokens, text-size scales, base styles
src/schemas/                  domain types: Proof Block, tiers and trust policy, ledger, CRA clock, stages
policy/                       trust-policy.yml and tier-state.yml templates
gitlab/  infra/  skills/      GitLab flows and components, Cloud Run deployment, the adopt-belay skill
cli/belay.mjs                 belay doctor | pair | scan | replay
```

The shared components are documented in `src/components/README.md`, and each screen has a
README in its feature folder. Two rules apply to all code: a file is at most 200 lines and a
folder holds at most 10 files. `npm run check:structure` enforces both.

## Licence

MIT. See [LICENSE](LICENSE).
