import type { Stage } from '@/schemas';
import type { MaturityCtx } from './ctx';
import { rescanOutcome } from './flow/credit';
import { rungText, type Mode } from './rungs';
import { inFlightIds, pendingIds, type MaturityState, type SectionKey, type Step } from './state';
import { nextStage } from './steps';

export type Action =
  | { type: 'mode'; mode: Mode }
  | { type: 'select'; stage: Stage }
  | { type: 'togglePick'; id: string }
  | { type: 'go'; step: Step }
  | { type: 'move'; dir: 1 | -1 }
  | { type: 'preview'; id: string }
  | { type: 'file'; id: string; index: number }
  | { type: 'section'; key: SectionKey; open: boolean }
  | { type: 'cancelSheet' }
  | { type: 'send' }
  | { type: 'merge'; id: string }
  | { type: 'ran'; id: string }
  | { type: 'rescanGap'; id: string }
  | { type: 'rescanAll' };

const say = (s: MaturityState, text: string): MaturityState => ({ ...s, notice: { seq: (s.notice?.seq ?? 0) + 1, text } });
const openGap = (s: MaturityState): MaturityState => ({ ...s, open: { ...s.open, gap: true } });

/** Keeps the stepper honest after any change: a step whose precondition vanished falls back, the preview follows picks. */
function settle(s: MaturityState, ctx: MaturityCtx): MaturityState {
  const pend = pendingIds(s, ctx);
  let step = s.step;
  if ((step === 2 || step === 3) && !pend.length) step = 1;
  if (step === 4 && !inFlightIds(s).length) step = 1;
  const pv = step === 2 && !(s.pv && pend.includes(s.pv)) ? (pend[0] ?? null) : s.pv;
  const sheet = step === 3 ? s.sheet : false;
  return step === s.step && pv === s.pv && sheet === s.sheet ? s : { ...s, step, pv, sheet };
}

function togglePick(s: MaturityState, ctx: MaturityCtx, id: string): MaturityState {
  const g = ctx.gap(id);
  if (!g) return s;
  if (s.flow[id]) return openGap({ ...s, sel: g.stage, step: 4 });
  const picked = s.picked.includes(id);
  const next = { ...s, sel: g.stage, picked: picked ? s.picked.filter((p) => p !== id) : [...s.picked, id], step: s.step > 2 ? (1 as Step) : s.step };
  return say(next, `${picked ? 'unpicked' : 'picked'} ${id} · nothing written`);
}

function go(s: MaturityState, ctx: MaturityCtx, k: Step): MaturityState {
  const pend = pendingIds(s, ctx);
  const fly = inFlightIds(s);
  if ((k === 2 || k === 3) && !pend.length) return s;
  if (k === 4 && !fly.length) return s;
  let next: MaturityState = { ...s, step: k };
  if (k === 2) {
    const pv = s.pv && pend.includes(s.pv) ? s.pv : (pend[0] ?? null);
    next = openGap({ ...next, pv, sel: (pv && ctx.gap(pv)?.stage) || s.sel });
  }
  if (k === 3) next = { ...next, sheet: true };
  if (k === 4) {
    const own = ctx.gapByStage(s.sel);
    const first = fly[0] ? ctx.gap(fly[0]) : undefined;
    next = openGap({ ...next, sel: own && s.flow[own.id] ? s.sel : (first?.stage ?? s.sel) });
  }
  return next;
}

/** Left/right: in the preview step they walk the picked gaps, otherwise the nine stages. */
function move(s: MaturityState, ctx: MaturityCtx, dir: 1 | -1): MaturityState {
  const pend = pendingIds(s, ctx);
  const cur = ctx.gapByStage(s.sel);
  const i = cur ? pend.indexOf(cur.id) : -1;
  if (s.step === 2 && i >= 0) {
    const pv = pend[(i + dir + pend.length) % pend.length] ?? null;
    return { ...s, pv, sel: (pv && ctx.gap(pv)?.stage) || s.sel };
  }
  return { ...s, sel: nextStage(ctx, s.sel, dir) };
}

function send(s: MaturityState, ctx: MaturityCtx): MaturityState {
  const ids = pendingIds(s, ctx);
  const first = ids[0] ? ctx.gap(ids[0]) : undefined;
  if (!first) return s;
  const flow = { ...s.flow };
  for (const id of ids) flow[id] = ctx.gap(id)?.x.kind === 'probe' ? 'probed' : 'opened';
  const mrs = ids.map((id) => ctx.gap(id)?.x).filter((x) => x?.kind === 'mr').map((x) => x?.mrId);
  const text = mrs.length
    ? `opened ${mrs.join(', ')} as you${ids.length > mrs.length ? ' · probe ran, read only' : ''}`
    : `probe ran · read only · ${first.stage} stays ${rungText(s.now[first.stage])}`;
  return say(openGap({ ...s, flow, picked: s.picked.filter((p) => !ids.includes(p)), sheet: false, step: 4, sel: first.stage }), text);
}

function rescanGap(s: MaturityState, ctx: MaturityCtx, id: string): MaturityState {
  const g = ctx.gap(id);
  const phase = s.flow[id];
  if (!g || (phase !== 'merged' && phase !== 'ran')) return s;
  const stamped = { ...s, scannedAt: ctx.nowClock, ageMin: 0 };
  if (rescanOutcome(g.x.needsRun, phase) === 'nolift') {
    return say({ ...stamped, flow: { ...s.flow, [id]: 'nolift' } }, `rescan · engine ${ctx.engine} · ${g.stage} stays ${rungText(g.from)}: configured, not exercised`);
  }
  const row = { mr: g.x.mrId ?? id, stage: g.stage, move: `${rungText(g.from)} → ${rungText(g.to)}`, verdict: 'credited' as const, why: `rescan ${ctx.nowClock}, same engine` };
  const next = { ...stamped, flow: { ...s.flow, [id]: 'credited' as const }, now: { ...s.now, [g.stage]: g.to }, sel: g.stage, animKey: s.animKey + 1, log: [...s.log, row] };
  return say(next, `rescan · engine ${ctx.engine} · ${g.stage} ${rungText(g.from)} → ${rungText(g.to)} credited`);
}

function step(s: MaturityState, ctx: MaturityCtx, a: Action): MaturityState {
  switch (a.type) {
    case 'mode':
      return { ...s, mode: a.mode, animKey: s.animKey + 1 };
    case 'select':
      return { ...s, sel: a.stage };
    case 'togglePick':
      return togglePick(s, ctx, a.id);
    case 'go':
      return go(s, ctx, a.step);
    case 'move':
      return move(s, ctx, a.dir);
    case 'preview':
      return { ...s, pv: a.id, sel: ctx.gap(a.id)?.stage ?? s.sel };
    case 'file':
      return { ...s, file: { ...s.file, [a.id]: a.index } };
    case 'section':
      return s.open[a.key] === a.open ? s : { ...s, open: { ...s.open, [a.key]: a.open } };
    case 'cancelSheet':
      return { ...s, sheet: false, step: s.step === 3 ? (pendingIds(s, ctx).length ? 2 : 1) : s.step };
    case 'send':
      return send(s, ctx);
    case 'merge': {
      const g = ctx.gap(a.id);
      if (!g || s.flow[a.id] !== 'opened') return s;
      return say({ ...s, flow: { ...s.flow, [a.id]: 'merged' } }, `${g.x.mrId} merged by you in GitLab (simulated)`);
    }
    case 'ran': {
      const g = ctx.gap(a.id);
      if (!g || s.flow[a.id] !== 'nolift') return s;
      const what = g.x.runsOn === 'tag' ? 'tagged release pipeline' : 'pipeline on main';
      return say({ ...s, flow: { ...s.flow, [a.id]: 'ran' } }, `${what} ran · new job passed (simulated)`);
    }
    case 'rescanGap':
      return rescanGap(s, ctx, a.id);
    case 'rescanAll':
      return say({ ...s, scannedAt: ctx.nowClock, ageMin: 0 }, `npx belay scan --engine ${ctx.engine} · read only · no rung moved`);
  }
}

/** The whole screen as one pure reducer. `ctx` is the shared dataset joined with the screen's fixtures. */
export function reduce(s: MaturityState, a: Action, ctx: MaturityCtx): MaturityState {
  return settle(step(s, ctx, a), ctx);
}
