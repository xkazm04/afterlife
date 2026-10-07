---
name: Raj (DevOps / SRE Lead)
role: DevOps and SRE Lead (owns merge request pipelines, runners, protected branches and the default branch across ~40 GitLab projects; on call when main goes red)
maps_to: /monitor (every project as a beat, with stale, quarantined and unwatched told apart), /fleet (what is stale or unwatched, and which classes the tripwire took down), /ladder (the pipeline medic's tiers and every demotion the tripwire recorded), /task/[id] (the medic's rerun counts, recomputed from the jobs API)
tech_level: power-user
promotion: discovery
references:
  - https://dora.dev/research/2024/dora-report/ - DORA 2024. AI adoption lifted individual throughput but cut delivery stability, mostly through larger batches. Sets his core fear that agents speeding up changes will quietly erode the stability he is paid to protect, and his bar that any agent touching pipelines is judged on stability first.
  - https://community.sonarsource.com/t/when-your-quality-gate-fails-should-your-pipeline-fail-or-continue/107436 - the block-or-warn debate behind every CI gate. A gate that fires on noise teaches the team to ignore it. Sets his bar for the tripwire, which must demote on real failures only, and must not miss a real one.
  - https://docs.gitlab.com/user/project/repository/branches/protected/ - protected branches control who can push and merge, Code Owner approval and force push. Sets the ground truth he expects Afterlife's view of the default branch and of the agents' branches to agree with.
---

## Who they are
Raj leads DevOps and SRE at the payments company. He owns the merge request pipelines, the GitLab runners on Kubernetes, protected branches and the release flow for about 40 active projects across two subgroups. He is the one paged at 2am when the default branch goes red and the one engineering leads ask "why is main red?" Priya has armed the pipeline medic on one subgroup. Raj decides whether he trusts it to retry pipelines on its own, and whether the tripwire catches a bad agent before he does.

## Background / lived experience
Raj came up through operations into SRE: on-call rotations, incident reviews, and a long migration from per-project branch settings to group-level protected branches and approval rules so he could stop hand-editing forty settings pages. He watched the DORA 2024 finding happen on his own dashboards: the team that leaned hardest on AI shipped bigger merge requests, and its change failure rate crept up before anyone admitted it.

He has fought the retry-until-green habit for years. A `retry: 2` sprinkled into a `.gitlab-ci.yml` hid a real race condition for three months. A quality gate that blocked on noise picked up a bypass label within a month and became decoration. So an agent that retries pipelines on its own can go one of two ways: it removes his 2am toil, or it automates the exact habit he has been fighting. What is personally at stake: if the medic retries a real failure into a green build and that build ships, it is his pipeline and his incident review.

## Voice
Terse and pipeline-minded. "Retried how many times, on which SHA, and what were the counts?" "Five reruns and four failures isn't a flake, it's a bug." "Green after a retry isn't green, it's lucky." "If it pages on noise once, my team mutes it forever." "Show me what the tripwire did, and when." He says "flaky" like a slur. When a read matches what he knows about a project he relaxes: "Yeah, that one's been stale since the runner move, good." When it's wrong he goes quiet and starts reproducing it.

## Jobs to be done
- "Let the medic retry runner flakes alone, since `pipeline.retry` may go hands-off, while it can never quarantine a test without a person, since `test.quarantine` stops at Supervised."
- "Trust that a flake verdict is computed, not claimed: at least five usable reruns of one SHA, counts recomputed by the engine from the jobs API, and a failure rate at or above the policy's real-failure line read as a real failure."
- "See at a glance which projects are watched, stale, quarantined or not watched at all, without opening forty pipeline pages."
- "Know the tripwire took autonomy away the moment a merge was reverted, a post-merge proof failed or main stayed red for an hour, and see that event without asking anyone."

## What "good" looks like (acceptance expectations)
Grounded in the DORA stability finding and the gate-noise bar in `references`:
- Monitor draws one lead per group and a beat per project. A stale project is a flat line with its age, an unwatched project is a dashed break that reads unknown, never zero, and a quarantined project carries its dip. Decisions waiting on a person are visible on the beat.
- A medic task on Task shows the reruns per job with links and a rerun-stats verdict. A runner flake that went five for five green after retry reads as a flake with its counts; a test failing at or above the threshold reads as a real failure and is not retried into green.
- Ladder records every tripwire demotion: the trigger (revert, reopened finding, post-merge proof fail, default branch red for an hour), the evidence link, "by tripwire", and the cooldown. Demotion goes down only; nothing climbs back without a person's promotion merge request.
- Hands-off reaches production only for the mechanical proofs (exploit test, rerun stats) and only inside the envelope of at most six files and 120 lines.
- An event Afterlife cannot attribute, such as a merge request from an unknown author with no event behind it, is shown as unattributed rather than dropped.
- Fleet reconciles with Monitor: the same projects are stale on both, and an unknown never sorts as healthy.

## Pet peeves / friction triggers
- Retry-until-green with a robot face on it.
- A medic verdict with no counts and no job links.
- A tripwire that fires on noise and demotes a healthy class, or that stays quiet on a real revert.
- Green by default: a project shown healthy only because nobody polled it.
- A feed that is stale without saying how stale.
- The same known-bad project re-surfacing as a fresh decision on every poll.
- A view he has to add up per project in his head; if it doesn't roll up, it's his old tabs with extra steps.
