---
name: Oliver (QA / Test Lead)
role: QA Lead and Test Engineering Manager (owns test strategy, the flaky-test policy and review-app testing across six squads on GitLab)
maps_to: /task/[id] (the medic's flake verdict with its rerun counts, the QA agent's replayable bug), /needs-you (quarantine merge requests and filed bugs waiting on a person), /ladder (why test quarantine stops at Supervised while filing a bug may go hands-off), /monitor (which projects carry a quarantine right now)
tech_level: comfortable
promotion: discovery
references:
  - https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html - Google's account of flaky tests at scale. Reruns are reserved for tests marked flaky, flakiness is tracked over time and kept apart from tests that fail reliably, and the real work is fixing the cause rather than masking it. Sets his bar that a flake verdict needs counts behind it and that quarantine is a step toward a fix, not an exit.
  - https://about.codecov.io/blog/mutation-testing-how-to-ensure-code-coverage-isnt-a-vanity-metric/ - coverage is execution, not validation. Sets his view that a quarantined test is coverage the team no longer has, even while the number still counts it.
  - https://www.confident-ai.com/blog/llm-testing-in-2024-top-methods-and-strategies - AI-generated testing scales volume but risks low-value output and silent failures, so it needs a harness and grounding rather than trust. Sets his bar that a bug filed by an agent must replay before it is worth anyone's triage time.
---

## Who they are
Oliver is the QA Lead and Test Engineering Manager at the payments company, setting test strategy and the quality bar for six squads, about 60 engineers. He doesn't write most of the tests anymore; he owns the CI test stages, the flaky-test policy and the review apps the squads test against. Priya has armed the pipeline medic, which calls failures flaky or real and proposes quarantines, and is about to arm exploratory QA, which walks a review app and files bugs; that track is locked until a review-app environment exists. Oliver decides whether a quarantine is a fix or a way to hide a bug, and whether agent-filed bugs belong in his squads' queues.

## Background / lived experience
Oliver started in manual QA, moved into automation, then became an SDET and a manager. He has lived testing theatre: 90% line coverage on a suite that asserted nothing, snapshot tests that broke on every refactor and caught no behaviour. He ran the flaky-test quarantine by hand for two years, a spreadsheet of skipped tests with an owner and a date each, and watched it rot into a graveyard of tests quarantined "temporarily" eighteen months earlier, still skipped and still counted in coverage.

So he has two fears about the agents. The medic could become quarantine-as-a-service, an agent whose real job is making red go away. The QA agent could flood triage with plausible bugs nobody can reproduce, each costing an engineer an afternoon to disprove. What is personally at stake: he championed "more automation, more AI-assisted testing", so if quality quietly rots under a green pipeline, that is on him.

## Voice
Precise, dry, allergic to green ticks that mean nothing. "Flaky by whose count?" "A quarantined test is coverage you no longer have." "Quarantine needs an owner and an exit date, or it's a graveyard." "If I can't replay the steps, it isn't a bug report, it's a rumour." "Volume isn't validation." He is pragmatic about AI, not hostile: "Fine, let it file bugs, as long as each one replays." When a verdict shows its working he relaxes: "That's the call I'd have made by hand."

## Jobs to be done
- "When the medic calls a failure a flake, see the rerun counts on that SHA and decide whether to accept the quarantine merge request, which must come with a tracking issue that has an owner."
- "Keep test quarantine a supervised action for good: the agent proposes, a person merges, every time."
- "Get bugs from the QA agent with replayable steps against the review app and a screenshot hash, so triage takes minutes instead of a reproduction afternoon."
- "Know which projects carry a quarantine right now, and see when a quarantined test comes back."

## What "good" looks like (acceptance expectations)
Grounded in how flakiness is handled at scale and in the coverage-is-not-validation bar in `references`:
- A medic verdict on Task is a rerun-stats proof: at least five usable reruns of one SHA, the failure rate set against the policy's threshold, counts recomputed from the jobs API with a link per job. A flake is a rate below the threshold and above zero; a rate at or above it is a real failure, and the screen says which.
- A flake produces a tracking issue and a quarantine merge request, never a silent skip, and the merge request waits for a person because `test.quarantine` can never pass Supervised. Ladder shows that ceiling.
- A QA bug carries a repro proof: steps replayed by a scripted browser and a screenshot hash. Where the engine's check is still a stub, Task says so rather than showing a pass.
- Needs you shows quarantine merge requests and filed bugs as decisions with one action each, and "The click" says what merging a quarantine will and will not do.
- Monitor and Fleet mark quarantined projects distinctly from red, stale and unwatched ones.

## Pet peeves / friction triggers
- A quarantine with no owner and no exit.
- A retry counted as a fix.
- Agent-filed bugs with no repro steps, or the same bug filed three times.
- A stub proof displayed as a pass.
- A flake verdict that can't tell a runner failure from a failing test.
- A quality number that keeps counting tests the pipeline no longer runs.
