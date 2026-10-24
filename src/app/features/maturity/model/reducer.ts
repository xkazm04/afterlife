import type { Stage } from '@/schemas';
import type { MaturityCtx } from './ctx';
import { rescanAll, rescanGap, type MoveAction } from './flow/moves';
import { closeSheet, sendingIds, sendStep, sent, sheetIds, type SendAction } from './flow/send';
import type { Mode } from './rungs';
import { inFlightIds, openGap, pendingIds, say, sentName, type MaturityState, type SectionKey, type Step } from './state';
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
  /** The server opened these gaps' MRs (the MR it named, or null). Moves no rung: the next scan decides that. */
  | { type: 'sent'; opened: Readonly<Record<string, string | null>>; text: string }
  /** A sent gap's next move (merge, its job runs, the rescan of that gap): model/flow/moves.ts. */
  | MoveAction
  | { type: 'rescanAll' }
  | SendAction;

/** The gap the preview shows: the one it shows, while still picked and unsent, else the first pending one. */
const previewOf = (pv: string | null, pend: readonly string[]): string | null => (pv && pend.includes(pv) ? pv : (pend[0] ?? null));

/**
 * Keeps the stepper honest after any change: a step whose precondition vanished falls back, the preview follows picks. The
 * sheet stays while it shows a gap (an answered one too); a closed sheet holds no writes (the files may move before it opens).
 */
function settle(s: MaturityState, ctx: MaturityCtx): MaturityState {
  const pend = pendingIds(s, ctx);
  let step = s.step;
  if (step === 2 && !pend.length) step = 1;
  if (step === 3 && !sheetIds(s, ctx).length) step = 1;
  if (step === 4 && !inFlightIds(s).length) step = 1;
  const pv = step === 2 ? previewOf(s.pv, pend) : s.pv;
  const sheet = step === 3 ? s.sheet : false;
  const send = sheet || !Object.keys(s.send).length ? s.send : {};
  return step === s.step && pv === s.pv && sheet === s.sheet && send === s.send ? s : { ...s, step, pv, sheet, send };
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
    const pv = previewOf(s.pv, pend);
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
      return closeSheet(s, ctx);
    case 'sent':
      return sent(s, ctx, a.opened, a.text);
    case 'merge': {
      const g = ctx.gap(a.id);
      if (!g || s.flow[a.id] !== 'opened') return s;
      return say({ ...s, flow: { ...s.flow, [a.id]: 'merged' } }, `${sentName(s, a.id)} merged by you in GitLab (simulated)`);
    }
    case 'ran': {
      const g = ctx.gap(a.id);
      if (!g || s.flow[a.id] !== 'nolift') return s;
      const what = g.x.runsOn === 'tag' ? 'tagged release pipeline' : 'pipeline on main';
      return say({ ...s, flow: { ...s.flow, [a.id]: 'ran' } }, `${sentName(s, a.id)} · ${what} ran · new job passed (simulated)`);
    }
    case 'rescanGap':
      return rescanGap(s, ctx, a.id);
    case 'rescanAll':
      return rescanAll(s, ctx);
    default:
      return sendStep(s, ctx, a);
  }
}

/** While a send is in flight nothing may take the sheet down: its answers are on their way to it. */
const HOLDS: ReadonlySet<Action['type']> = new Set<Action['type']>(['go', 'cancelSheet', 'togglePick', 'sent']);

/** The whole screen as one pure reducer. `ctx` is the shared dataset joined with the screen's fixtures. */
export function reduce(s: MaturityState, a: Action, ctx: MaturityCtx): MaturityState {
  if (HOLDS.has(a.type) && sendingIds(s).length) return s;
  return settle(step(s, ctx, a), ctx);
}
