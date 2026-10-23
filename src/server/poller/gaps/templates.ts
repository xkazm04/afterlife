// Which maturity gaps a fixed template can close: the server writes those files itself (D2's apply-gap-template); every
// other gap is a change the person makes, and the desk only names it.
import type { GapTemplateId } from '@/server/actions/types';
import type { Stage } from '@/schemas/stages';

/** The one rung step each template earns, by stage. An unknown rung (null) has no template: what is there is not known. */
const TEMPLATES: Partial<Record<Stage, { from: number; to: number; id: GapTemplateId }>> = {
  secure: { from: 0, to: 1, id: 'secure-includes' },
  package: { from: 0, to: 1, id: 'package-build' },
  plan: { from: 0, to: 1, id: 'plan-issue-templates' },
};

/** The template that closes `stage` from rung `from` to `to`, or null when the change is not mechanical. */
export function templateFor(stage: Stage, from: number | null, to: number): GapTemplateId | null {
  const t = TEMPLATES[stage];
  return t && t.from === from && t.to === to ? t.id : null;
}
