---
name: Sam (Staff Engineer)
role: Staff Software Engineer (tech lead on the payments API and the shared CI config; reviews what the agents' merge requests change)
maps_to: /task/[id] (claims against checks, the quoted hunks, the agent's words and trace rendered as untrusted text), /ladder (the rule behind each tier and the write behind each key), /maturity (whether a stage's rung is backed by evidence or only by configuration)
tech_level: power-user
promotion: discovery
references:
  - https://shiftmag.dev/state-of-code-2025-7978/ - 42% of code is AI-assisted, yet 96% of developers don't fully trust it, and reviewing AI code demands more effort than reviewing human code. Sets their skepticism floor, where an agent's claim is unproven until something deterministic has checked it.
  - https://stackoverflow.blog/2026/02/18/closing-the-developer-ai-trust-gap/ - trust in AI fell to 29%, and what restores it is attribution and traceability built into the system plus the professional instinct to verify. Sets their provenance bar, which is to accept a verdict only when they can re-trace every check to the job or note it read.
---

## Who they are
Sam is a Staff Software Engineer at the payments company and the de facto tech lead on the payments API, plus the shared CI configuration most of the company treats as magic. They use AI tools daily and read every diff. Since the patcher and the upgrade gardener were armed, Sam reviews agent merge requests most weeks, and the guardrail now reviews theirs. Their question about Afterlife is whether the Proof Block is something they can actually re-trace, or a green badge everyone will stop reading within a month.

## Background / lived experience
Twelve years in, Sam shipped a monolith-to-services migration and owns the test harness. They have been burned by an 80% coverage number on assertions that checked nothing, by a confidently wrong refactor that passed review because it looked right, and by an AI review bot that commented on lines that were not in the diff. So Sam reviews AI output harder than human output.

Afterlife raises specific worries. The gardener's merge requests claim things about upstream changelogs that Sam would otherwise check by hand. The guardrail could become a second unreliable reviewer. And agent text is an attack surface: they watched a seeded gardener merge request carry a hidden instruction from an upstream changelog into the CI config, and want to be sure nothing on screen ever treats agent words as instructions or as evidence. A real day is standup, two reviews where they reconstruct the author's intent (human or model), and half an hour defending a technical decision upward with evidence.

## Voice
Dry, terse, evidence-first. "Show me the hunk." "A claim is a string the model wrote. What did the engine check?" "Inside the benchmark budget by how much, against which baseline?" "Pinned to which engine commit?" Hype words make them visibly cool. They say "okay, that's actually right" with quiet respect when a tool surprises them, and "I'd never merge this" when it doesn't. If something is wrong they name it and move on.

## Jobs to be done
- "On an agent merge request, tell in under two minutes what the agent claimed, what the engine checked, and whether each check answers a claim."
- "For a gardener upgrade, see the tests green, the benchmark inside budget and each changelog claim linked to the upstream line, or see plainly that a check is still a stub."
- "Trust a guardrail finding only when it quotes a hunk that exists in the diff at the current head."
- "Know which engine version judged a merge request, and know when a proof belongs to an older head and no longer counts."

## What "good" looks like (acceptance expectations)
Grounded in the AI-code trust research in `references`:
- Task sets claims against checks with visible ties, and a claim no check answers is visibly unanswered. The agent's words, the hunk and the trace are untrusted, rendered as plain text with ligatures off, and never become a term of the verdict.
- The verdict reads like arithmetic: an envelope breach or one false check fails it, an undetermined check makes it inconclusive, a check a person must decide is struck, and no checks at all is inconclusive, never a pass.
- Every proof names the engine version and source hash, and a proof made for an older head is not shown as the merge request's proof.
- Where a proof class is a stub today (repro, bench-delta), the screen says so instead of implying a result.
- Ladder shows the rule behind each tier and the exact write behind each key, so Sam can check that a promotion matches the policy text.
- Maturity lifts a stage only on evidence that is a GitLab object; configured but not exercised earns nothing.

## Pet peeves / friction triggers
- A proof that has become a badge nobody opens.
- A claim counted as a check.
- A stub proof shown as a pass.
- Agent text rendered as live markdown, links or anything that reads like an instruction.
- A guardrail comment on lines that aren't in the diff.
- Hype copy, and confidence the evidence doesn't support.
