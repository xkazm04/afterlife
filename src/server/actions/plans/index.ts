import type { ActionIntent } from '../types';
import type { Plan, PlanContext } from './context';
import { planCraReady } from './cra';
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
  }
}
