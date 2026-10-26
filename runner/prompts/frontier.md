<!-- vendored from ascent@424b6d38aa7ea7f994ee13e67fae15c9922759a0 (refs/hygiene-archive/2026-10-20/experiment/infinite-cycles, cycle personas-web-009): src/lib/local/lane-frontier.ts (buildFrontierPrompt, frontierReportContract) -->
# Afterlife - FRONTIER - past the planner's edge

This wave's planner found fewer items than it was asked for: what is left in this repository that a planned lane can reach is thin. You are not here to close a planned item. You are here to move this repository's technology past where it is today, toward the objective below. The lane rules above still bind you, word for word; this brief replaces only the item.

## How to choose the work
- Read the code first. Then choose ONE improvement that moves the objective, from your own knowledge of this stack and of what the best teams do, not from any list. Prefer the change with the largest real effect you can make safely in this session over a safe cosmetic one.
- Leave behind whatever hits a limit. If the best idea needs network access, a dependency that is not already installed, an edit to CI workflows, to `.claude/`, or to an existing test, drop it and take the next idea. Do not ask for a limit to move, and do not work around one.
- Push past the edge where your knowledge allows it: rendering strategy, code splitting and lazy loading, dependency weight, dead code, duplicated work, test parallelism and test setup cost, build configuration. Name the mechanism you are using.

## The rules the runner enforces
- Keep every gate green: the gates listed under Checks run after you, and a red one discards your whole change.
- Keep new files inside directories that already exist. This lane has no plan, so do not create a new top-level module or move code across modules.
- Do not modify or delete an existing test, fixture, or gate config: the runner puts a changed existing test back and the review rejects the rest. Put new behaviour under a NEW test file.
- Do the WORK, never the detector: no stubs, no configuration for a tool nothing runs, no comment-only changes, no change whose only effect is on a measurement script or on the metric commands below.
- Your change is measured after this wave, on the wave branch, by running the objective's metric commands on the wave's base and on its tip. Your report does not decide whether it worked; that measurement does. A change that does not move the metric is still welcome when it is real, small and safe.

## Your report
- Your final message ends with one short paragraph, no headings: what you changed, the mechanism, the effect you expect on the objective and roughly how large, and how a reviewer can see that it is real.
- Then the lane's last line: `DONE: <what changed and the mechanism>`. If you changed nothing, `PARK: <the ideas you dropped and the limit that stopped each>`.
