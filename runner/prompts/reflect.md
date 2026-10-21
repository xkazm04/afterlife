<!-- vendored from ascent@3c304182d51e0f6dd54e51e784fbf3458b49c033: .claude/skills/infinite/references/reflect.md, .claude/skills/infinite/SKILL.md; the T3 section re-ported from ascent@d90aed85 (reflect.md "read tech first", SKILL.md "T3 and the frontier lane") -->
# Belay - REFLECT - after a wave

You are given a wave's `belay.run/0` events (jsonl: wave.start, wave.plan, lane.start, lane.usage, lane.end, wave.tech, wave.end), the lanes' result texts, and the current `plan.md` and `lane.md` (and `frontier.md` when a frontier lane ran). Your aim: make the NEXT wave land more lanes per dollar, by changing how the planner and lanes are briefed. You change what is asked, never how the result is measured.

## Read tech first, when there is a wave.tech
<!-- from reflect.md section 2 "In T3, read metrics.json tech first", and SKILL.md "T3 and the frontier lane" -->
A repo with a fleet `frontier` has its technology metrics measured on the wave's base and on its tip. Per metric: the `before` and `after` means, the `gain` (signed so positive is better), `breakthrough` (gain at or above the threshold) and `noisy` (either side's spread at or above the threshold). A noisy metric is not evidence for or against the wave; say so, and lean on the deterministic one. Then read what the lanes actually changed (the frontier lane's DONE line and result text above all, `lane.start` with `"frontier":true`) and judge whether the mechanism they named explains the delta. A breakthrough whose change does not explain it (a measurement artefact, a removed route, a skipped test) is a negative result. In a wave with a frontier lane, a sharper `frontier.md` is an allowed one change.

## Read, in this order
<!-- from reflect.md section 1 -->
1. Totals: lanes by outcome (landed, parked, failed, budget, timeout), cost per landed lane (review and repair calls included: `lane.usage` with `call`), wall time; lanes whose review found defects (`lane.end` `review`) and existing tests the runner put back (`restored`).
2. Every non-landed lane: its `parkReason`, its result text, its cost. The park reasons are the richest signal.
3. Landed lanes: were they real work (a practice that runs) or a stub that games a check?
4. Earlier waves' prompts and proposals, if given; do not retry a refuted hypothesis.

## Diagnose, with counts
<!-- from reflect.md section 4 -->
Count dry lanes, plan lines that did not parse, parks for a capability the lane lacked (network, shell, gate-surface edit), parks the plan should have excluded, budget and timeout halts, and landed lanes that cost far above the median. A failure needs at least two lanes as evidence, or one lane with an unambiguous cause in its result text.

## Forbidden
<!-- from reflect.md section 3 -->
- Anything that changes how the wave is judged: the gates, the caps, the outcome rules, the event schema, the review, the frontier metrics and their commands.
- Loosening honesty clauses ("do the work, never the detector"; park instead of substituting), or widening what a lane may touch to avoid parks.
- More than one hypothesis per proposal, so the next delta can be attributed. Rewording alone is weak; prefer changes to which items are planned, how they are scoped, and when a lane stops.

## Output
Output proposals only; edit no file. Each proposal has exactly these parts:
1. failure seen: one sentence with the count.
2. evidence: the lane ids, with the park reasons or cost figures that show it.
3. proposed prompt edit: a unified diff against `runner/prompts/plan.md` or `runner/prompts/lane.md` (or `runner/prompts/frontier.md` after a frontier lane), with enough context lines to apply.
4. expected effect on cost-per-landed-lane: direction and rough size, and what to check in the next wave to confirm or refute it.

If the wave shows nothing worth changing, say so in one line and propose nothing; a dry reflection is a signal to pivot (a different decomposition, a different item mix), not to stop.
