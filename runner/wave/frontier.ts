// The frontier lane (Ascent paradigm P4, cycle personas-web-009): when a repo has a fleet `frontier` and the plan
// yields fewer lanes than asked, the wave runs ONE more lane after the planned ones, on the repo's technology
// objective instead of a plan item. It claims nothing; it goes through the same review, repair, gates and landing as
// any lane, and whether it worked is decided by the wave's T3 measurement (wave.tech), never by its own report.
import type { FleetRepo } from '../index';
import { lanePrompt, type LaneChecks, type PlanItem } from './plan';

/** The frontier lane's id: one per wave, so it never collides with a plan item (those are slugs of the plan's ids). */
export const FRONTIER_LANE = 'frontier';

/** Whether this wave runs a frontier lane: the repo has one, and the plan filled fewer lanes than asked. */
export const wantsFrontier = (repo: FleetRepo, planned: number, asked: number): boolean => !!repo.frontier && planned < asked;

/** The item the lane, its review and its commit are judged against: the objective stands in for the plan's why. */
export function frontierItem(repo: FleetRepo): PlanItem {
  const objective = repo.frontier?.objective ?? '';
  const first = objective.split(/\r?\n/)[0]?.trim() ?? '';
  return {
    lane: FRONTIER_LANE,
    title: `frontier: ${first.length > 72 ? `${first.slice(0, 69)}...` : first}`,
    files: [],
    why: `[frontier] ${objective}`,
    challenge: 'the change must move a metric below by its mechanism, not by touching the measurement; name the mechanism',
  };
}

/** The frontier lane's prompt: lane.md (its rules), frontier.md, the objective and its metrics, then the lane's checks. */
export function frontierPrompt(laneBase: string, frontierBase: string, repo: FleetRepo, capUsd: number, checks: LaneChecks): string {
  const f = repo.frontier;
  if (!f) throw new Error(`runner: ${repo.slug} has no frontier`);
  const metrics = f.metrics.map((m) => `  - ${m.name} (${m.direction === 'up' ? 'higher' : 'lower'} is better, a ${Math.round(m.threshold * 100)}% gain is a breakthrough): ${m.command ?? '(read after the command above)'}`);
  const brief = `${laneBase.trimEnd()}\n\n${frontierBase.trimEnd()}\n\n## The objective (set by the operator)\n${f.objective}\n\n## How it is measured, on the wave's base and its tip\n${metrics.join('\n')}`;
  // lanePrompt adds the item block (the objective as its why), the dollar cap, the checks and the step marker.
  return lanePrompt(brief, frontierItem(repo), capUsd, checks);
}
