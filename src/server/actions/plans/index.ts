import { planArm, planDisarm } from '../arm/plan';
import type { ActionIntent } from '../types';
import { ActionRefused, type Plan, type PlanContext } from './context';
import { planCraReady } from './cra';
import { planEnroll } from './enroll/plan';
import { planGapTemplate } from '../gap/plan';
import { planGapMr } from './gap';
import { planPromote } from './promote';
import { planRevoke } from './revoke';

export { ActionRefused, type Plan, type PlanContext } from './context';

/** Builds the commands for an intent through the port's PlanBuilders. Reads GitLab; writes nothing. */
export function planIntent(ctx: PlanContext, intent: ActionIntent): Promise<Plan> {
  switch (intent.kind) {
    case 'revoke-class': return planRevoke(ctx, intent);
    case 'promote-class': return planPromote(ctx, intent);
    case 'mark-cra-ready': return planCraReady(ctx, intent);
    case 'stage-gap-mr': return planGapMr(ctx, intent);
    case 'apply-gap-template': return planGapTemplate(ctx, intent);
    case 'arm-track': return planArm(ctx, intent);
    case 'disarm-track': return planDisarm(ctx, intent);
    case 'enroll-track': return planEnroll(ctx, intent);
    // A real project's writes are planned by actions/vitals, which actions.ts routes them to; never through the GitLab port.
    case 'queue-runs':
    case 'install-skill':
    case 'enable-app-insights':
      return Promise.reject(new ActionRefused(`${intent.kind} is a project write: it is planned by actions/vitals, not against GitLab`));
  }
}
