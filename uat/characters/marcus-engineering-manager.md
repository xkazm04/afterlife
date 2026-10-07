---
name: Marcus (Engineering Manager)
role: Engineering Manager (two squads, ~12 engineers, on the payments projects where agents now open merge requests)
maps_to: /fleet (his squads' projects, what acts alone, what is stale and what waits for a person), /monitor (a quick look at what waits for whom), /maturity (which DevSecOps stages are real, and the next gap worth a sprint), /needs-you (what lands on his team's plate this week), / (the whole group, with his district in it)
tech_level: comfortable
promotion: discovery
references:
  - https://newsletter.pragmaticengineer.com/p/measuring-developer-productivity - measure team outcomes, never individuals; metrics that touch performance reviews get gamed and corrode trust. Sets the line Afterlife must not cross with its own ledger, which attributes every click to a person.
  - https://www.swarmia.com/developer-productivity/ - the bar comparable tools set, with no developer leaderboards and team-level views. Sets his expectation that what agents cost and save is shown per team, never per engineer.
  - https://en.wikipedia.org/wiki/Bus_factor - knowledge concentration and key-person risk. Sets his worry that if one person holds every decision in Needs you, the queue stops when that person is away.
---

## Who they are
Marcus manages two squads, about twelve engineers, on the payments projects. Since Priya armed the patcher and the upgrade gardener on the payments subgroup, agents open merge requests in his squads' projects every week, and the guardrail leaves review notes on his engineers' own merge requests. His skip-level VP asks in every staff sync, "are the agents saving us time?" Marcus needs a team-level answer, and he needs to know what the agents cost his reviewers before anyone promotes them further.

## Background / lived experience
Marcus was a senior backend engineer for seven years before he got the team, and he still reads diffs. At a previous company he lived through a productivity dashboard that ranked people: leadership quoted merged-PR counts in calibration, his best engineer (a quiet mentor who unblocked everyone and shipped little of her own) scored badly, and within a quarter the team was gaming diff counts. He has been allergic to individual scoreboards ever since.

Afterlife worries him in four specific ways. First, review load: every Supervised class means a review someone on his team must do, and an agent merge request with no proof attached is pure cost. Second, attribution: Afterlife writes as the person who clicks, so when one of his engineers runs a staged write, that engineer's name is on the change. He wants that to be a deliberate act, not a rubber stamp. Third, key-person risk: if only Priya can clear the decisions that block his projects, they pile up the week she is on holiday. Fourth, the ledger: a record of who clicked what is exactly the raw material for the leaderboard he refuses to build.

## Voice
Plain, dry, a little weary; an ex-engineer who speaks in merge requests and reviews, not synergies. "Don't make me a number-cop." "How many reviews did the agents cost us this week, and how many did they save?" "If this ranks my people by clicks, I close the tab." "Who's the only person who can clear that queue?" "I could get this from the merge request list in an afternoon, so what did you save me?" He pushes back on anything that overclaims: "Three hundred agent actions isn't value, it's activity."

## Jobs to be done
- "See, for my squads' projects, which agents act alone, which wait for review, and what is waiting on my team, in two minutes."
- "Know what the Supervised classes cost my reviewers against what the hands-off ones save, at team level, before I back a promotion."
- "See when a decision blocking my projects can only be cleared by one person, so I can raise it before it becomes a bottleneck."
- "Pick the next maturity gap worth a sprint, see the evidence behind it, and preview the merge request before anyone sends it."

## What "good" looks like (acceptance expectations)
Grounded in team-level measurement (Pragmatic Engineer, Swarmia) and the key-person bar in `references`:
- Fleet narrows to his squads' group and shows each project's tiers, this week's proofs and the decisions waiting, with stale and unknown projects sorted apart from healthy ones rather than counted as healthy.
- Monitor shows waiting decisions as marks on each project's beat, so he can see at a glance where his team is needed.
- Maturity credits a stage only with evidence that is a GitLab object; configured but never exercised gets no lift. A gap's merge request shows its exact commands before it is sent as the person who sends it.
- Needs you tells him which decisions concern his projects and what each click will do.
- Nothing on any screen ranks individuals. The ledger attributes actions for accountability, and the product never turns that into a per-person count.

## Pet peeves / friction triggers
- Per-person counts of clicks, approvals or merges.
- Agent merge requests dropped on his reviewers with no proof attached.
- Vanity totals such as "312 agent actions this week" presented as value.
- Maturity credit for configuration that never ran.
- A decision queue only one person can clear, with nothing on screen saying so.
- Anything slower than opening GitLab himself; if it doesn't beat the afternoon, it's dead.
