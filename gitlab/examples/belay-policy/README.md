# belay-policy: project layout

The project that holds the rules and each agent's current standing. It is separate from the target on purpose: an agent that can
change the target's code and CI must not be able to change the rules that govern it.

```
belay-policy/
  trust-policy.yml    the rules (copy of policy/trust-policy.yml in the Belay repo, then tuned by the owners)
  tier-state.yml      where each agent's action class stands now (copy of policy/tier-state.yml at the start)
  CODEOWNERS          see CODEOWNERS next to this file: both files and CODEOWNERS itself are owned by @acme/belay-owners
```

`policy/` in the Belay repo is the source of the two YAML files; this folder only shows the layout and the protection.

## Settings

| Setting | Value | Why |
|---|---|---|
| Protected branch `main` | allowed to merge: Maintainers; allowed to push and merge: the policy token's account only (`BELAY_POLICY_TOKEN`'s); "Require approval from code owners" on | A person changes policy by merge request. The policy token's direct push is how the tripwire demotes at once. [S] docs.gitlab.com/user/project/codeowners/ |
| Membership | the account behind `BELAY_POLICY_TOKEN` is a Developer or Maintainer here (needs push on `main`); `BELAY_BOT_TOKEN`'s account is **Reporter** here (F72, proposed); agents' service accounts are **not** members, directly or through the group | Agents can read nothing here but through the jobs, and cannot edit it |
| Job token allowlist (inbound) | each target project, and `belay-apply` | proof-engine and tier-gate (in the targets) and belay-apply clone this project with `CI_JOB_TOKEN` [S] docs.gitlab.com/ci/jobs/ci_job_token/ |
| Token | `BELAY_POLICY_TOKEN`: a project access token of the bot, scope `write_repository` or `api`, role Developer or higher | stored on **belay-apply only** as a **protected, masked and hidden** variable, never on a target (F4; `../../apply/README.md`) |

## How standing changes

- **Down, at the next sweep:** belay-apply's tripwire (`gitlab/apply/tripwire-sweep.mjs`, every 10 minutes) pushes
  `tier-state.yml` with `Belay-Event:` lines in the commit message. The engine rewrites the file in place and can only lower a tier.
- **Up, slowly:** a person opens a merge request that edits `tier-state.yml`, and the owners approve it. Belay prepares the MR from
  the Ladder screen; it never merges it. The tripwire never promotes.
- If direct push by the bot is refused (spike S8), set the tripwire's `write_mode: mr`. The demotion then waits for an owner, which
  weakens the "instant" property; say so wherever that fallback is used.
