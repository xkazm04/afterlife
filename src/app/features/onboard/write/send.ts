// Onboard's click: confirm every write whose preview is on screen, one at a time, and say what each did. A confirm that
// threw keeps NO_ANSWER's words and adds why it threw (and Next's digest), as Setup's armFlow does with its `noAnswer`.
import { NO_ANSWER, outcomeOf, reasonOf } from '@/server/actions/words';
import type { OnboardIntent, Opened } from '../model/batch';
import { openedOf, sendWrite, writeKey, type WriteView } from './write';

/** A confirm that threw: nobody knows whether the write ran. Says why it threw (and the digest), for the server log. */
export const noAnswer = (what: string, why: string): string => `${what}: ${NO_ANSWER} (${why})`;

export interface Sent {
  /** What each confirmed write opened, by project id. */
  opened: Record<string, Opened>;
  /** One line per write that did not go, for the status line. */
  notSent: string[];
}

/**
 * Confirms each intent's preview on screen (`viewOf`), in order. `put` replaces a view: a changed preview is shown again;
 * a refused or failed one no longer stands, so it cannot be sent again from here.
 */
export async function sendEach(
  intents: readonly OnboardIntent[],
  viewOf: (key: string) => WriteView | undefined,
  put: (key: string, view: WriteView) => void,
): Promise<Sent> {
  const opened: Record<string, Opened> = {};
  const notSent: string[] = [];
  for (const intent of intents) {
    const k = writeKey(intent);
    const what = `${intent.kind === 'arm-track' ? 'arm' : 'enroll'} ${intent.track} on ${intent.project}`;
    try {
      const r = await sendWrite(intent, viewOf(k));
      const o = r ? outcomeOf(r, what) : null;
      if (!r || !o) {
        notSent.push(`${what}: no exact MR on screen`);
        continue;
      }
      const made = openedOf(r);
      if (made) opened[intent.project] = made;
      else notSent.push(o.text);
      if (o.status === 'changed') put(k, { kind: 'preview', preview: o.preview });
      if (o.status === 'refused' || o.status === 'failed') put(k, { kind: 'refused', reason: o.text });
    } catch (e) {
      notSent.push(noAnswer(what, reasonOf(e)));
    }
  }
  return { opened, notSent };
}
