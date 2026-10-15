// The live list's writes, pure: one slot per item (model/slot/slot.ts, the desk's rule) and the items a done confirm sent.
// `useLiveActs` wraps this with useReducer and only runs the effects (ask, confirm).
import type { NeedsYouItem } from '@/lib/demo';
import type { ActionResponse } from '@/server/actions/types';
import type { WriteView } from '@/server/actions/words';
import type { LiveAnswer } from '../live';
import { beginSend, retry, settle, shown, viewed, type WriteSlot } from './slot';

export interface LiveState {
  slots: Readonly<Record<string, WriteSlot>>;
  /**
   * A done write's item, as listed when it was sent: the refresh drops it from the items (only open proposals are listed),
   * so the strip of what was sent keeps it, with the answer, for the session.
   */
  sent: Readonly<Record<string, NeedsYouItem>>;
}

export const LIVE_EMPTY: LiveState = { slots: {}, sent: {} };

export type LiveAction =
  | { type: 'viewed'; id: string; view: WriteView }
  | { type: 'retry'; id: string }
  | { type: 'sending'; id: string }
  /** The confirm's response, or null when it got none. `what` names the write in the answer (default: the item's title). */
  | { type: 'ran'; id: string; item?: NeedsYouItem; response: ActionResponse | null; what?: string };

function put(s: LiveState, id: string, slot: WriteSlot | null | undefined): LiveState {
  return slot && slot !== s.slots[id] ? { ...s, slots: { ...s.slots, [id]: slot } } : s;
}

export function liveReduce(s: LiveState, a: LiveAction): LiveState {
  const slot = s.slots[a.id];
  switch (a.type) {
    case 'viewed':
      return put(s, a.id, viewed(slot, a.view));
    case 'retry':
      return put(s, a.id, retry(slot));
    case 'sending':
      return put(s, a.id, beginSend(slot));
    case 'ran': {
      const next = put(s, a.id, settle(slot, a.response, a.what ?? a.item?.title ?? a.id));
      const done = next.slots[a.id]?.answer?.status === 'done';
      return done && a.item ? { ...next, sent: { ...next.sent, [a.id]: a.item } } : next;
    }
  }
}

const each = <T,>(s: LiveState, f: (slot: WriteSlot) => T | undefined): Readonly<Record<string, T>> =>
  Object.fromEntries(Object.entries(s.slots).flatMap(([id, slot]) => {
    const v = f(slot);
    return v === undefined ? [] : [[id, v]];
  }));

/** Each item's write as the list draws it (`shown`): an unsure one shows why there is nothing to run. */
export const liveViews = (s: LiveState): Readonly<Record<string, WriteView>> => each(s, shown);

/** Each item's last answer, only what the response said (or that there was none). */
export const liveAnswers = (s: LiveState): Readonly<Record<string, LiveAnswer>> =>
  each(s, (slot) => slot.answer && { status: slot.answer.status === 'unsure' ? 'failed' : slot.answer.status, text: slot.answer.text });
