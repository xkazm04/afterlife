// The one line a stage page opens with: its rung now, and the gap that would lift it.
import type { Stage } from '@/schemas';
import type { Gap, MaturityCtx } from '../ctx';
import { nextOf, rungLabel, rungText } from '../rungs';
import type { MaturityState } from '../state';
import { ranWhere, type Phase } from './credit';

/** A sent gap's phase in words, as the gaps table says it: never the code name ("nolift"). */
const phaseWords = (phase: Phase, gap: Gap): string =>
  ({
    probed: 'probed, read only',
    opened: 'opened',
    merged: 'merged',
    ran: `ran ${ranWhere(gap.x.runsOn)}`,
    nolift: 'no lift: configured, not exercised',
    credited: 'credited',
  })[phase];

export function stageLede(ctx: MaturityCtx, state: MaturityState, stage: Stage): string {
  const now = state.now[stage];
  const nx = nextOf(now, ctx.base[stage].next);
  const at = rungLabel(now, ctx.rungNames);
  const gap = ctx.gapByStage(stage);
  const phase = gap ? state.flow[gap.id] : undefined;
  const rest = !gap ? 'no gap proposed' : phase ? `gap ${gap.id} ${phaseWords(phase, gap)}` : `gap ${gap.id} would take it to ${rungText(gap.to)}`;
  return now != null && nx > now ? `${at} · next ${rungText(nx)} · ${rest}` : `${at} · ${rest}`;
}
