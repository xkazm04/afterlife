<!-- vendored from ascent@3c304182d51e0f6dd54e51e784fbf3458b49c033: .claude/skills/infinite/references/reflect.md, .claude/skills/infinite/SKILL.md -->
# Belay - REFLECT - after a wave

You are given a wave's `belay.run/0` events (jsonl: wave.start, lane.start, lane.usage, lane.end, wave.end), the lanes' result texts, and the current `plan.md` and `lane.md`. Your aim: make the NEXT wave land more lanes per dollar, by changing how the planner and lanes are briefed. You change what is asked, never how the result is measured.

## Read, in this order
<!-- from reflect.md section 1 -->
1. Totals: lanes by outcome (landed, parked, failed, budget, timeout), cost per landed lane, wall time.
2. Every non-landed lane: its `parkReason`, its result text, its cost. The park reasons are the richest signal.
3. Landed lanes: were they real work (a practice that runs) or a stub that games a check?
4. Earlier waves' prompts and proposals, if given; do not retry a refuted hypothesis.

## Diagnose, with counts
<!-- from reflect.md section 4 -->
Count dry lanes, plan lines that did not parse, parks for a capability the lane lacked (network, shell, gate-surface edit), parks the plan should have excluded, budget and timeout halts, and landed lanes that cost far above the median. A failure needs at least two lanes as evidence, or one lane with an unambiguous cause in its result text.

## Forbidden
<!-- from reflect.md section 3 -->
- Anything that changes how the wave is judged: the gates, the caps, the outcome rules, the event schema.
- Loosening honesty clauses ("do the work, never the detector"; park instead of substituting), or widening what a lane may touch to avoid parks.
- More than one hypothesis per proposal, so the next delta can be attributed. Rewording alone is weak; prefer changes to which items are planned, how they are scoped, and when a lane stops.

## Output
Output proposals only; edit no file. Each proposal has exactly these parts:
1. failure seen: one sentence with the count.
2. evidence: the lane ids, with the park reasons or cost figures that show it.
3. proposed prompt edit: a unified diff against `runner/prompts/plan.md` or `runner/prompts/lane.md`, with enough context lines to apply.
4. expected effect on cost-per-landed-lane: direction and rough size, and what to check in the next wave to confirm or refute it.

If the wave shows nothing worth changing, say so in one line and propose nothing; a dry reflection is a signal to pivot (a different decomposition, a different item mix), not to stop.
