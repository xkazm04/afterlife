---
name: adopt-belay
description: Install the Belay package (custom flows, proof engine, trust policy, local app) into a GitLab group and prove it on a target project. Use when asked to set up Belay or the Life After Code agent package.
---

# adopt-belay (skeleton: steps are filled in from the commands actually used in week 1)

This skill does the same steps as Belay's Setup screen, without the screen: the steps are the
same and so are their numbers. The agent does the `git` and `glab` work. Everything that needs a
licence, a card, a secret or a legal identity is handed back to a person as a numbered checklist.

## Rules

- Print every command before running it. With `--dry-run`, print only.
- Never write a secret into a file, an issue, a log or a commit. Secrets are typed by the human.
- Never disable a protection, approval rule or environment gate to make a step pass.
- A step is done when `belay doctor` says so, not when a command exits 0.
- Stop at the first failed verification, write it into `ONBOARDING-REPORT.md`, and hand back.
- Re-running is safe: every step checks the current state first.

## Steps

**Human** marks a step a person must perform. **Agent** marks a step the coding agent performs.

| # | Who | Step |
|---|---|---|
| 0 | Agent | Preflight: git, glab, node, `glab auth status`, GitLab version |
| 1 | Agent | Clone Belay, `npm install`, `npm run dev` |
| 2 | Agent | Questions: group, target project, tier ceiling, model route, Google Cloud project, credit cap, CRA drill mode |
| 3 | **Human** | Licence and access: Ultimate trial, hackathon group |
| 4 | Agent | Create projects: target, belay-pack, belay-policy, belay-ledger, belay-engine (every component job clones belay-engine at `engine_ref`) |
| 5 | Agent | Push the demo bank (`ledgerline`) and pair the checkout |
| 6 | **Human** | Runner and billing on Google Cloud |
| 7 | **Human** | Google Cloud OIDC, using the Cloud Shell script |
| 8 | **Human** | Secrets |
| 9 | Agent | Protections: approval rules, protected main, `belay/*` a protected branch pattern that only Maintainers and the flow accounts can push to (gitlab/components/README.md, Exposure), CODEOWNERS on CI and policy paths |
| 10 | Agent, then **Human** | Bootstrap MR. The human merges it. |
| 11 | Agent, else **Human** | Enable flows |
| 12 | Agent | First scan and the first gap MR |
| 13 | Agent | Seeded faults (labelled seeded) and the schedule |
| 14 | Agent | Report, and hand back the issue "Belay: what only you can do" |
