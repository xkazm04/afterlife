// A gap's send, as the layout's reducer holds it: one slot per gap on the Send sheet, asking -> viewed -> sending -> done
// (or back to viewed with a changed, refused or failed answer). The sheet only issues the two server calls and dispatches
// what they answer; a done answer opens the gap here the moment it arrives, so no way the sheet goes away can drop it.
// Pure: the slots are data, the transitions are functions of the state.
import type { Outcome, WriteView } from '@/server/actions/words';
import type { MaturityCtx } from '../ctx';
import { openGap, pendingIds, say, type MaturityState } from '../state';

/** What the response said of one gap's send: done names the MR GitLab opened; changed, refused and failed say so. */
export interface GapAnswer {
  status: Outcome['status'];
  text: string;
  /** The MR GitLab opened ("!22"), when the response names one. */
  mr?: string;
}

export type SendPhase = 'asking' | 'viewed' | 'sending' | 'done';

/** One gap's write on the open sheet: its preview (or why there is none) and the last answer to sending it. */
export interface SendSlot {
  phase: SendPhase;
  view?: WriteView;
  answer?: GapAnswer;
}

export type SendAction =
  /** The sheet asks the server for these gaps' exact writes (nothing runs). */
  | { type: 'ask'; ids: readonly string[] }
  | { type: 'viewed'; id: string; view: WriteView }
  /** Ask again for a refused write. */
  | { type: 'retry'; id: string }
  /** The button confirms these gaps' previews. */
  | { type: 'sending'; ids: readonly string[] }
  /** The server answered one gap's send; `view` is the new write on screen (changed) or why there is none (refused). */
  | { type: 'answered'; id: string; answer: GapAnswer; view?: WriteView };

/** The gaps on the sheet, in the dataset's order: the picked ones not sent, and the ones this sheet already answered. */
export const sheetIds = (s: MaturityState, ctx: MaturityCtx): string[] => {
  const pend = pendingIds(s, ctx);
  return ctx.gaps.map((g) => g.id).filter((id) => pend.includes(id) || s.send[id]);
};

export const sendingIds = (s: MaturityState): string[] => Object.keys(s.send).filter((id) => s.send[id]?.phase === 'sending');

/** The server opened gap `id`'s MR (named `mr`, or null): it leaves the picks and is in flight. Moves no rung. */
export function recordOpened(s: MaturityState, id: string, mr: string | null): MaturityState {
  if (s.flow[id]) return s;
  return { ...s, flow: { ...s.flow, [id]: 'opened' }, mrs: mr ? { ...s.mrs, [id]: mr } : s.mrs, picked: s.picked.filter((p) => p !== id) };
}

/** The batch form: the server opened these gaps' MRs; the sheet closes on After merge. */
export function sent(s: MaturityState, ctx: MaturityCtx, opened: Readonly<Record<string, string | null>>, text: string): MaturityState {
  const ids = Object.keys(opened).filter((id) => ctx.gap(id) && !s.flow[id]);
  const first = ids[0] ? ctx.gap(ids[0]) : undefined;
  if (!first) return s;
  const rec = ids.reduce((acc, id) => recordOpened(acc, id, opened[id] ?? null), s);
  return say(openGap({ ...rec, sheet: false, step: 4, sel: first.stage }), text);
}

/** Cancel or Close: back to the preview, or on to After merge when this sheet opened an MR. */
export function closeSheet(s: MaturityState, ctx: MaturityCtx): MaturityState {
  const first = ctx.gap(Object.keys(s.send).find((id) => s.send[id]?.phase === 'done') ?? '');
  if (s.step === 3 && first) return openGap({ ...s, sheet: false, send: {}, step: 4, sel: first.stage });
  return { ...s, sheet: false, send: {}, step: s.step === 3 ? (pendingIds(s, ctx).length ? 2 : 1) : s.step };
}

const put = (s: MaturityState, id: string, slot: SendSlot): MaturityState => ({ ...s, send: { ...s.send, [id]: slot } });

function answered(s: MaturityState, ctx: MaturityCtx, a: Extract<SendAction, { type: 'answered' }>): MaturityState {
  const slot = s.send[a.id];
  const isDone = a.answer.status === 'done';
  // Recorded whether or not the sheet is still open: an MR the server opened is never forgotten.
  const rec = isDone && ctx.gap(a.id) ? say(recordOpened(s, a.id, a.answer.mr ?? null), a.answer.text) : s;
  if (!slot) return isDone ? rec : say(rec, a.answer.text);
  return put(rec, a.id, { phase: isDone ? 'done' : 'viewed', view: a.view ?? slot.view, answer: a.answer });
}

export function sendStep(s: MaturityState, ctx: MaturityCtx, a: SendAction): MaturityState {
  switch (a.type) {
    case 'ask': {
      const ids = a.ids.filter((id) => s.sheet && !s.send[id]);
      return ids.length ? { ...s, send: { ...s.send, ...Object.fromEntries(ids.map((id) => [id, { phase: 'asking' }])) } } : s;
    }
    case 'viewed':
      return s.send[a.id]?.phase === 'asking' ? put(s, a.id, { phase: 'viewed', view: a.view }) : s;
    case 'retry': {
      if (s.send[a.id]?.phase !== 'viewed') return s;
      return { ...s, send: Object.fromEntries(Object.entries(s.send).filter(([id]) => id !== a.id)) };
    }
    case 'sending': {
      const ids = a.ids.filter((id) => { const x = s.send[id]; return x?.phase === 'viewed' && x.view?.kind === 'preview'; });
      return ids.length ? { ...s, send: { ...s.send, ...Object.fromEntries(ids.map((id) => [id, { ...s.send[id], phase: 'sending' }])) } } : s;
    }
    case 'answered':
      return answered(s, ctx, a);
  }
}
