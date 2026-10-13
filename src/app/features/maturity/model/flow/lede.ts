// The one line a stage page opens with: its rung now, and the gap that would lift it.
import type { Stage } from '@/schemas';
import type { MaturityCtx } from '../ctx';
import { nextOf, rungText } from '../rungs';
import type { MaturityState } from '../state';

export function stageLede(ctx: MaturityCtx, state: MaturityState, stage: Stage): string {
  const now = state.now[stage];
  const nx = nextOf(now, ctx.base[stage].next);
  const at = `${rungText(now)} ${now != null ? (ctx.rungNames[now] ?? '') : 'unknown'}`.trim();
  const gap = ctx.gapByStage(stage);
  const phase = gap ? state.flow[gap.id] : undefined;
  const rest = !gap ? 'no gap proposed' : phase ? `gap ${gap.id} ${phase}` : `gap ${gap.id} would take it to ${rungText(gap.to)}`;
  return now != null && nx > now ? `${at} · next ${rungText(nx)} · ${rest}` : `${at} · ${rest}`;
}
