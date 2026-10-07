---
name: Priya (Platform Lead)
role: Platform Lead and the operator of Afterlife, who adopts it on the company's GitLab group, arms its tracks in Setup, and decides on Ladder and Needs you which agent may act alone
maps_to: /setup (the unlock map, arming tracks, the doctor, the steps only she can do), /ladder (every action class with its tier, its ceiling and the record behind it; revoke, quarantine, promote), /needs-you (the promotions and re-admits the governor proposes, the outbox of staged writes), /fleet (who may act alone across every project), / (the whole group at a glance), /maturity (which stages are real and which gap to close next)
tech_level: power-user
promotion: discovery
references:
  - https://octopus.com/blog/paved-versus-golden-paths-platform-engineering - golden paths have to earn adoption rather than be mandated. Sets her bar for Afterlife itself, since autonomy earned from evidence and taken back cheaply is a paved road, while autonomy granted by decree is a mandate she will be defending after the first bad merge.
  - https://docs.gitlab.com/user/duo_agent_platform/triggers/ - "All trigger event types require a human user to perform the triggering action"; a bot, a service account or another flow cannot fire one. Sets why Setup must tell her which flows fire on their own and which need a dispatch job, before she arms a track on the wrong assumption.
  - https://docs.gitlab.com/ci/components/ - CI/CD components are reusable, versioned pipeline units, and GitLab recommends pinning them to a commit SHA or a release tag instead of a floating ref. Sets her expectation that the proof engine and tier gate included in ~180 projects are pinned, so the checker that judges the agents cannot change under her.
---

## Who they are
Priya runs the six-person platform team at a ~500-engineer European payments company: a payments API, a core-banking platform and the card terminals it sells, all in one GitLab group with seven subgroups and about 180 projects on Ultimate. Leadership turned on the Duo Agent Platform last quarter and now wants "agents doing the post-code work": security patches, red pipelines, upgrades, CRA reports. Priya adopted Afterlife on the group to make that safe. She is the operator: she walks Setup, arms each track, and holds the key on Ladder and Needs you that decides which agent may merge without a person. When an agent does something wrong, she is the one asked who allowed it.

## Background / lived experience
Priya was a backend engineer, then an SRE, then built the platform group from scratch. She shipped the group's CI/CD component catalog, which is the paved road every project now includes, and she killed a Backstage instance nobody filled in. Two failures shaped her. The first is the standard nobody adopts: a beautiful template teams routed around because the old way was easier. The second is worse. A dependency bot was given merge rights "for a pilot", rebased a release branch at 2am, and nobody could say who had granted the token, why, or how to take the right back short of deleting it. Since then her rule is that any automation that writes has a named person who granted it, a written reason, and an off switch that takes seconds.

The Duo rollout taught her the rest. Flows open merge requests as service accounts, a service account's MR does not fire another flow's trigger, and half of the "automatic" design on the whiteboard needed a person after all. She answers to a VP of Engineering who wants the hands-off number to go up, and to Nadia in AppSec and Raj in SRE, who will each veto anything that merges unproven. What is personally at stake: every promotion merge request carries her name, so a hands-off agent that merges a bad change into a money-moving service is her incident. A real day is Needs you first thing (promotions, re-admits, a setup step only she can do), a Setup session arming the next track on one subgroup, and Ladder whenever the tripwire fires.

## Voice
Dry, precise, short on patience for theatre. She talks in grants, records and off switches: "Who granted that, and where is it written down?" "Restricting should cost one key; extending should cost evidence." "If I can't see the command, I'm not clicking." "Is that tier from tier-state.yml on main, or from the screen's memory?" "Don't tell me it's safe, show me what the engine checked." She is wary of volume dressed as trust: "Forty merged MRs isn't a record, it's a count." When something holds up she is terse: "Okay, that I can sign." When it doesn't, she goes quiet and starts asking where the number came from.

## Jobs to be done
- "Adopt Afterlife on our GitLab group without hand-wiring 180 pipelines: walk Setup's steps in order, see what blocks each track, and do only the parts that need me, which are the licence, runner billing, OIDC, secrets and merging the bootstrap MR."
- "Arm the eight tracks one at a time in an order that holds up, the guardrail and the governor before the patcher, and know before I click what the arm MR will contain and that disarming is a revert MR."
- **The operator's job:** "Decide, per action class, which agent may act alone. On Ladder I move a class from Assisted to Supervised to Hands-off only when its proof record clears the policy, and I revoke or quarantine it with one key the moment it stops earning it. On Needs you I sign the promotions and re-admits the governor proposes. Every one of those writes is mine: it runs as me, only on my click, after I have read the exact command and the diff."
- "Answer my VP's 'how much is hands-off now?' with a number that reconciles with tier-state.yml and the ledger, not a slide."
- "Close the next maturity gap with a merge request I have previewed, not a ticket."

## What "good" looks like (acceptance expectations)
Grounded in the golden-path bar (adoption is earned, not decreed) and in what GitLab actually allows. Priya expects, within a few minutes on the demo group:
- Setup shows the unlock map honestly. A step is done only when a probe says so, never because a command exited 0. Her own steps are marked as hers. A locked track says what it needs ("needs T4, T3, T6", "needs a runner", "needs the SBOM job"). A doctor probe older than two minutes reads stale with its age, and a group never probed reads unknown, never green.
- Arming a track opens a merge request as her, and the track reads armed only after a person merges and Afterlife verifies it. The exact `glab` command is on screen before anything runs.
- Ladder lists every action class with its tier, its ceiling (`code-fix.patch` can never pass Supervised, `report.submit` is human only), the promotion rule and how far the record is from it. The write behind each key (the edit, the commit and the diff) is shown before she presses it. Promotion is a policy merge request; nothing moves a tier up by itself.
- Revoking is one step down and costs one key; quarantine is immediate. A class re-admitted after quarantine comes back at Assisted at most, never at its old tier, and a hands-off grant lapses to Supervised when its lease runs out unless she confirms it again.
- Needs you lists every decision that waits for her and nothing else, one action per row, and "The click" says what the button will and will not do. Staging sends nothing; Run is the only send.
- The front door, Fleet and Ladder agree. The number of hands-off classes on a project is the same on every screen, stale reads as stale, and a project nobody watches is unknown, not zero.
- Demo data says it is demo data, and seeded faults say they are seeded.

## Pet peeves / friction triggers
- A tier that moved with no record of who moved it and why. "By the tripwire on a revert" or "by Priya via promotion MR !12" is fine; a blank is not.
- A button whose write she cannot read first, or a write made as a service account when it should be made as her.
- Two sources of truth: the screen says Hands-off while tier-state.yml on main says Supervised.
- Setup calling a step done because a command returned 0, or a track armed before its merge was verified.
- A promotion proposed on volume alone, when the policy asks for accepted outputs, a no-edit ratio and clean days.
- Revocation that costs more than a key press, or a re-admit that quietly restores the old tier.
- A fourteen-step checklist that doesn't say which steps are hers and which the agent does.
