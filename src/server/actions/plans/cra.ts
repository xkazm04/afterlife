// Mark a CRA clock work item "ready to sign": one label change. A person submits on ENISA's platform; Belay never submits
// (report.submit is human only in trust-policy.yml).
import type { MarkCraReady } from '../types';
import { locate, type Plan, type PlanContext } from './context';

export async function planCraReady(ctx: PlanContext, intent: MarkCraReady): Promise<Plan> {
  const { project } = await locate(ctx, intent.project);
  return {
    title: `Mark CRA packet #${intent.issue} ready to sign`,
    summary: `Labels work item #${intent.issue} in ${project.pathWithNamespace} as ${ctx.operator}. A person submits; Belay never submits.`,
    commands: [ctx.port.plan.setIssueLabels({ project: project.id, iid: intent.issue, add: ['cra::ready-to-sign'], remove: ['cra::drafting'] })],
    diff: ['+ label cra::ready-to-sign', '- label cra::drafting'],
  };
}
