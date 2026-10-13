import type { MaturityCtx } from './ctx';
import { inFlightIds, pendingIds, type MaturityState, type Step } from './state';

const STEPS: readonly { k: Step; name: string; title: string }[] = [
  { k: 1, name: 'Pick', title: 'Pick gaps' },
  { k: 2, name: 'Preview', title: 'Preview the diffs' },
  { k: 3, name: 'Send', title: 'Send as you' },
  { k: 4, name: 'After merge', title: 'After the merge: credit' },
];

export interface StepView {
  k: Step;
  name: string;
  title: string;
  enabled: boolean;
  current: boolean;
  past: boolean;
  /** The small number after the name; null shows nothing. */
  count: number | null;
  /** The count is the loud "waits for you" badge (Send) rather than a dim number. */
  loud: boolean;
}

/** The toolbar stepper: Pick → Preview → Send → After merge. Preview and Send need a pick; After merge needs a send. */
export function stepsView(s: MaturityState, ctx: MaturityCtx): StepView[] {
  const pend = pendingIds(s, ctx);
  const mrs = pend.filter((id) => ctx.gap(id)?.x.kind === 'mr').length;
  const fly = inFlightIds(s).length;
  const enabled = [true, pend.length > 0, pend.length > 0, fly > 0];
  const counts = [pend.length, mrs, pend.length || null, fly];
  return STEPS.map((st, i) => ({
    ...st,
    enabled: enabled[i] ?? false,
    current: s.step === st.k,
    past: st.k < s.step,
    count: counts[i] ?? null,
    loud: st.k === 3,
  }));
}

/** The stage a left/right press selects, wrapping at both ends. */
export function nextStage(ctx: MaturityCtx, sel: MaturityState['sel'], dir: 1 | -1) {
  const n = ctx.stages.length;
  const i = ctx.stages.indexOf(sel);
  return ctx.stages[(i + dir + n) % n] ?? sel;
}

/**
 * The stage a stepper step lands on: Preview shows the first picked gap's diff and After merge follows the first sent one,
 * each on its stage's page. Pick and Send stay on the list (null).
 */
export function stepTarget(ctx: MaturityCtx, s: MaturityState, k: Step): MaturityState['sel'] | null {
  const id = k === 2 ? (s.pv && pendingIds(s, ctx).includes(s.pv) ? s.pv : pendingIds(s, ctx)[0]) : k === 4 ? inFlightIds(s)[0] : undefined;
  return (id && ctx.gap(id)?.stage) || null;
}
