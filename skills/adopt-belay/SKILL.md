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
| 4 | Agent | Create projects: target, belay-pack, belay-policy, belay-ledger, belay-engine (every component job clones belay-engine at `engine_ref`), belay-apply (the one project that holds the write tokens, F4; its folder is gitlab/apply) |
| 5 | Agent | Push the demo bank (`ledgerline`) and pair the checkout |
| 6 | **Human** | Runner and billing on Google Cloud |
| 7 | **Human** | Google Cloud OIDC, using the Cloud Shell script |
| 8 | **Human** | Secrets. On belay-apply only, at project level (never on a target, never a group or instance variable: every target pipeline inherits the group's): `BELAY_BOT_TOKEN`, `BELAY_POLICY_TOKEN`, `BELAY_DISPATCH_TOKEN`, `BELAY_LEDGER_TOKEN`, each Protect variable on and Masked and hidden (hidden is chosen when the variable is created). Set belay-apply's Minimum role to use pipeline variables to `no_one_allowed` and create its variable-free pipeline schedule on `main`. Source: gitlab/apply/README.md. `ANTHROPIC_API_KEY` is typed with `glab variable set ANTHROPIC_API_KEY --masked --protected`. The human types every value; the agent never sees one |
| 9 | Agent | Protections: approval rules with author-cannot-approve, protected main, `belay/*` a protected branch pattern that only Maintainers and the flow accounts can push to (gitlab/components/README.md, Exposure), a CODEOWNERS that covers `.gitlab-ci.yml` and `.gitlab/`; belay-apply's `main`: push No one, merge Maintainers, Code Owner approval required, force push off; belay-apply on the job token allowlists of belay-engine and belay-policy; the `v*` tags of belay-engine and belay-pack and `main` of belay-ledger protected against Developers (F39 at the settings layer; pinning the pack by commit is proposed, not done). `belay/*` guards no token. Read each project's protections first: GitLab already protects a pushed `main` and a second POST answers 409, so unprotect it and protect it again as listed (DELETE then POST, back to back; Setup's step 9 shows the commands). Done when Setup reads every setting back as listed |
| 10 | Agent, then **Human** | Bootstrap MR. The human merges it. |
| 11 | Agent, else **Human** | Enable flows |
| 12 | Agent | First scan and the first gap MR |
| 13 | Agent | Seeded faults (labelled seeded) and the schedule |
| 14 | Agent | Report, and hand back the issue "Belay: what only you can do" |
