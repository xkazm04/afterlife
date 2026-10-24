// After the send: the one next move of each sent gap (the gaps table and the stage page read it from here), and the
// rescan that decides merged gaps, one gap from its page or every merged gap at once from the toolbar. All simulated.
import type { Gap, MaturityCtx } from '../ctx';
import { moveText, rungText } from '../rungs';
import { say, sentName, type MaturityState } from '../state';
import { rescanOutcome, type Phase } from './credit';

/** What a sent gap can do next. The reducer's own actions. */
export type MoveAction = { type: 'merge'; id: string } | { type: 'ran'; id: string } | { type: 'rescanGap'; id: string };

export interface Move {
  action: MoveAction;
  label: string;
}

/** Opened merges, a no lift runs its job, merged or ran waits for a rescan; a decided or probed gap has no move. */
export function nextMove(phase: Phase, gap: Pick<Gap, 'id' | 'x'>): Move | null {
  const id = gap.id;
  switch (phase) {
    case 'opened':
      return { action: { type: 'merge', id }, label: 'Merge in GitLab' };
    case 'nolift':
      return { action: { type: 'ran', id }, label: gap.x.runsOn === 'tag' ? 'Tagged release runs' : 'Pipeline runs on main' };
    case 'merged':
    case 'ran':
      return { action: { type: 'rescanGap', id }, label: 'Rescan' };
    default:
      return null;
  }
}

/** The sent gaps a rescan would decide (merged, or merged and ran), in the dataset's order. */
const waiting = (s: MaturityState, ctx: MaturityCtx): Gap[] => ctx.gaps.filter((g) => s.flow[g.id] === 'merged' || s.flow[g.id] === 'ran');

/** A simulated rescan stamps the demo's clock; in live mode it invents no time, so the scan's own stays. */
const rescanned = (s: MaturityState, ctx: MaturityCtx): MaturityState => (ctx.nowClock ? { ...s, scannedAt: ctx.nowClock, ageMin: 0 } : s);

/** One gap's verdict on a rescan: its phase, and on a credit its rung and log row. No notice, no redraw. */
function decide(s: MaturityState, ctx: MaturityCtx, g: Gap): { s: MaturityState; credited: boolean; text: string } {
  if (rescanOutcome(g.x.needsRun, s.flow[g.id]!) === 'nolift') {
    return { s: { ...s, flow: { ...s.flow, [g.id]: 'nolift' } }, credited: false, text: `${g.stage} stays ${rungText(g.from)}: configured, not exercised` };
  }
  const row = { mr: sentName(s, g.id), stage: g.stage, move: moveText(g.from, g.to), verdict: 'credited' as const, why: `rescan${ctx.nowClock ? ` ${ctx.nowClock}` : ''} (simulated)` };
  const next = { ...s, flow: { ...s.flow, [g.id]: 'credited' as const }, now: { ...s.now, [g.stage]: g.to }, log: [...s.log, row] };
  return { s: next, credited: true, text: `${g.stage} ${moveText(g.from, g.to)} credited` };
}

/** The stage page's rescan: decides this one merged gap. */
export function rescanGap(s: MaturityState, ctx: MaturityCtx, id: string): MaturityState {
  const g = waiting(s, ctx).find((w) => w.id === id);
  if (!g) return s;
  const d = decide(rescanned(s, ctx), ctx, g);
  const next = d.credited ? { ...d.s, sel: g.stage, animKey: s.animKey + 1 } : d.s;
  return say(next, `rescan · engine ${ctx.engine} · ${d.text} (simulated)`);
}

/** The toolbar's rescan: decides every merged gap at once, one notice, the ropes redrawn once. Nothing merged: read only. */
export function rescanAll(s: MaturityState, ctx: MaturityCtx): MaturityState {
  const gaps = waiting(s, ctx);
  if (!gaps.length) return say(rescanned(s, ctx), `rescan · engine ${ctx.engine} · read only · no rung moved (simulated)`);
  let next = rescanned(s, ctx);
  const said: string[] = [];
  for (const g of gaps) {
    const d = decide(next, ctx, g);
    next = d.s;
    said.push(`${g.id} ${d.text}`);
  }
  if (next.log.length > s.log.length) next = { ...next, animKey: s.animKey + 1 };
  return say(next, `rescan · engine ${ctx.engine} · ${said.join(' · ')} (simulated)`);
}

/** The toolbar Rescan's title: what it will decide, or that it only reads. */
export function rescanTitle(s: MaturityState, ctx: MaturityCtx): string {
  const n = waiting(s, ctx).length;
  return n ? `Rescan, read only (R) · decides ${n} merged gap${n === 1 ? '' : 's'} (simulated)` : 'Rescan, read only (R). Simulated: nothing is scanned, no rung moves';
}
