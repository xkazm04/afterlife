// A live maturity gap's draft MR from a fixed template (types.ts GapTemplateId). Stub: D2 builds it.
import { ActionRefused, type Plan, type PlanContext } from '../plans/context';
import type { ApplyGapTemplate } from '../types';

export function planGapTemplate(_ctx: PlanContext, intent: ApplyGapTemplate): Promise<Plan> {
  return Promise.reject(new ActionRefused(`the ${intent.template} gap template is not built yet`));
}
