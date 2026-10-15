// One server-planned write (a policy MR, a gap MR), from the ask to the answer: the one rule every screen that sends one
// follows. Asking: the exact write is not on screen yet (or is asked for again). Ready: the preview is on screen and Run
// confirms it. Refused: there is no write, only why. Sending: one confirm is out. Answered: done, the write ran. Unsure:
// the confirm got no answer, so the write may or may not have run: Run stays closed until the write is asked for again.
// Pure: the desk reducer and the live list's reducer hold one slot per key.
import type { ActionResponse } from '@/server/actions/types';
import { mrOf, NO_ANSWER, outcomeOf, type Outcome, type WriteView } from '@/server/actions/words';

export type Phase = 'asking' | 'ready' | 'refused' | 'sending' | 'answered' | 'unsure';

/** The last answer to Run, as the response worded it (`outcomeOf`), or the no-answer text. */
export interface SlotAnswer {
  status: Outcome['status'] | 'unsure';
  text: string;
  /** Done in demo mode: nothing was sent to GitLab. */
  simulated: boolean;
  /** The MR GitLab opened ("!22"), when a done response names one. */
  mr: string | null;
}

export interface WriteSlot {
  phase: Phase;
  /** The server's preview, or why there is none. Kept while sending, answered and unsure, never run again from there. */
  view?: WriteView;
  answer?: SlotAnswer;
}

const phaseOf = (view: WriteView | undefined): Phase => (!view ? 'asking' : view.kind === 'preview' ? 'ready' : 'refused');

/** The write is being asked for (again). The last answer stays on screen. */
export const asked = (slot?: WriteSlot): WriteSlot => ({ phase: 'asking', ...(slot?.answer ? { answer: slot.answer } : {}) });

/** The preview call answered. Ignored while a confirm is out, after a done, and after no answer until asked again. */
export function viewed(slot: WriteSlot | undefined, view: WriteView): WriteSlot {
  if (slot && (slot.phase === 'sending' || slot.phase === 'answered' || slot.phase === 'unsure')) return slot;
  return { ...slot, phase: phaseOf(view), view };
}

export const canRun = (slot: WriteSlot | undefined): boolean => slot?.phase === 'ready' && slot.view?.kind === 'preview';
export const canAsk = (slot: WriteSlot | undefined): boolean => slot?.phase === 'refused' || slot?.phase === 'unsure';
/** Nothing asked yet, or asked for again: the screen asks the server for it. */
export const needsAsk = (slot: WriteSlot | undefined): boolean => !slot || slot.phase === 'asking';

/** Run: one confirm, of the preview on screen. Null (send nothing) unless Run is open: the double-send guard. */
export const beginSend = (slot: WriteSlot | undefined): WriteSlot | null => (slot && canRun(slot) ? { ...slot, phase: 'sending' } : null);

/** A refused or unsure write is asked for again; anything else stays as it is. */
export const retry = (slot: WriteSlot | undefined): WriteSlot | undefined => (canAsk(slot) ? asked(slot) : slot);

/**
 * The confirm answered (`r`), or got no answer (null). Changed puts the new preview on screen; refused replaces the write
 * with its reason; failed keeps it (GitLab said what happened); done records the MR. `what` names the write for the text.
 */
export function settle(slot: WriteSlot | undefined, r: ActionResponse | null, what: string): WriteSlot {
  const view = slot?.view;
  if (!r) return { phase: 'unsure', ...(view ? { view } : {}), answer: { status: 'unsure', text: NO_ANSWER, simulated: false, mr: null } };
  const o = outcomeOf(r, what);
  if (!o) return { ...slot, phase: phaseOf(view) }; // a preview is not an answer: nothing was sent
  const answer: SlotAnswer = { status: o.status, text: o.text, simulated: o.status === 'done' && o.simulated, mr: r.status === 'done' ? mrOf(r.results) : null };
  if (o.status === 'changed') return { phase: 'ready', view: { kind: 'preview', preview: o.preview }, answer };
  if (o.status === 'refused') return { phase: 'refused', view: { kind: 'refused', reason: o.reason }, answer };
  if (o.status === 'failed') return { ...slot, phase: phaseOf(view), answer };
  return { ...slot, phase: 'answered', answer };
}

/** What an unsure write shows where the preview was: no write to run, and why. */
export const UNSURE_VIEW: WriteView = { kind: 'refused', reason: NO_ANSWER };

/** The write as a screen draws it: nothing while asked for, the reason when unsure (Run never sees the old preview). */
export function shown(slot: WriteSlot | undefined): WriteView | undefined {
  if (!slot || slot.phase === 'asking') return undefined;
  return slot.phase === 'unsure' ? UNSURE_VIEW : slot.view;
}
