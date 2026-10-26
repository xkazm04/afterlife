import type { MaturityCtx } from './ctx';
import { inFlightIds, pendingIds, type MaturityState, type Step } from './state';

/** The four steps' names, the same before the read (the stepper paints at once). */
export const STEP_NAMES: readonly { k: Step; name: string; title: string }[] = [
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
  // Send's loud badge says "waits for you": it counts the MRs the sheet would open, as Preview does, never a probe it cannot send.
  const counts = [pend.length, mrs, mrs || null, fly];
  return STEP_NAMES.map((st, i) => ({
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
 * The stage page a stepper step lands on, read from the state the reducer's go left (`went`): Preview and After merge open
 * the stage it selected (the previewed gap's, the selected stage's or else the first sent gap's), Pick and Send stay on the
 * list (null). The reducer picks the gap; this never picks it a second time.
 */
export function stepTarget(went: MaturityState, k: Step): MaturityState['sel'] | null {
  return (k === 2 || k === 4) && went.step === k ? went.sel : null;
}
