import type { Stage } from '@/schemas';
import type { MaturityCtx } from '../ctx';
import { isDeep, levelFor, nextOf, mrName, rungText, type Level } from '../rungs';
import type { MaturityState } from '../state';

/** A pickable gap tag sitting on a route's next bolt. */
export interface ClipView {
  id: string;
  label: string;
  picked: boolean;
  /** The gap is already sent: the tag shows the MR id instead of a pick state. */
  sent: boolean;
  title: string;
  ariaLabel: string;
}

/** Everything the crag needs to draw one route, decided once so the SVG parts stay dumb. */
export interface RouteView {
  stage: Stage;
  index: number;
  /** Rung drawn for the current mode (null: unknown). */
  lv: Level;
  /** Rung held now (the solid rope in Target mode). */
  now: Level;
  day0: Level;
  deep: boolean;
  /** Show the d0 chalk tick (hidden in Day 0 mode, where the rope itself is Day 0). */
  chalk: boolean;
  /** The dashed next-bolt ring: its rung, or null. */
  ring: number | null;
  clip: ClipView | null;
  selected: boolean;
  ariaLabel: string;
}

export function routeViews(s: MaturityState, ctx: MaturityCtx): RouteView[] {
  return ctx.stages.map((stage, index) => {
    const base = ctx.base[stage];
    const now = s.now[stage];
    const lv = levelFor(s.mode, base, now);
    const nr = nextOf(now, base.next);
    const ring = s.mode !== 'day0' && now != null && nr > now ? nr : null;
    const g = ctx.gapByStage(stage);
    const phase = g ? s.flow[g.id] : undefined;
    let clip: ClipView | null = null;
    if (ring != null && g && g.to === ring && phase !== 'credited') {
      const picked = s.picked.includes(g.id) && !phase;
      const label = phase ? mrName(s.mrs, g.id) : g.id + (picked ? ' ✓' : '');
      clip = {
        id: g.id,
        label,
        picked,
        sent: !!phase,
        title: `${g.id} · ${g.title}`,
        ariaLabel: `${phase ? 'In flight' : picked ? 'Unpick' : 'Pick'} gap ${g.id}: ${g.title}`,
      };
    }
    return {
      stage,
      index,
      lv,
      now,
      day0: base.day0,
      deep: isDeep(lv),
      chalk: s.mode !== 'day0',
      ring,
      clip,
      selected: s.sel === stage,
      ariaLabel: `${stage}: ${rungText(lv)} ${lv != null ? (ctx.rungNames[lv] ?? '') : 'unknown'}`,
    };
  });
}
