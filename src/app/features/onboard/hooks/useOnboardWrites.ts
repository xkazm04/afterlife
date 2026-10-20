'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { NO_ANSWER, outcomeOf } from '@/server/actions/words';
import type { OnboardIntent, Opened } from '../model/batch';
import { askWrite, openedOf, sendWrite, writeKey, type WriteView } from '../write/write';

export interface OnboardWrites {
  /** The exact MR behind a write, as the server planned it. Undefined while asked. */
  viewOf: (intent: OnboardIntent) => WriteView | undefined;
  /** Ask for that write once (previewAction). Never sends anything. */
  want: (intent: OnboardIntent) => void;
  /**
   * The click: confirm every write whose preview is on screen, one at a time. Answers what each confirmed write opened
   * (by project id) and one line per write that did not go, for the status line.
   */
  sendAll: (intents: readonly OnboardIntent[]) => Promise<{ opened: Record<string, Opened>; notSent: string[] }>;
}

/** The writes on the Onboard screen: their server previews, asked once each, and their confirms. */
export function useOnboardWrites(): OnboardWrites {
  const [views, setViews] = useState<Readonly<Record<string, WriteView>>>({});
  const asked = useRef(new Set<string>());

  const want = useCallback((intent: OnboardIntent) => {
    const k = writeKey(intent);
    if (asked.current.has(k)) return;
    asked.current.add(k);
    void askWrite(intent).then((view) => setViews((v) => ({ ...v, [k]: view })));
  }, []);

  const sendAll = useCallback(
    async (intents: readonly OnboardIntent[]) => {
      const opened: Record<string, Opened> = {};
      const notSent: string[] = [];
      for (const intent of intents) {
        const k = writeKey(intent);
        const what = `${intent.kind === 'arm-track' ? 'arm' : 'enroll'} ${intent.track} on ${intent.project}`;
        try {
          const r = await sendWrite(intent, views[k]);
          const o = r ? outcomeOf(r, what) : null;
          if (!r || !o) {
            notSent.push(`${what}: no exact MR on screen`);
            continue;
          }
          const made = openedOf(r);
          if (made) opened[intent.project] = made;
          else notSent.push(o.text);
          // a changed preview is shown again; a refused or failed one no longer stands, so it cannot be sent again from here
          if (o.status === 'changed') setViews((v) => ({ ...v, [k]: { kind: 'preview', preview: o.preview } }));
          if (o.status === 'refused' || o.status === 'failed') setViews((v) => ({ ...v, [k]: { kind: 'refused', reason: o.text } }));
        } catch {
          notSent.push(`${what}: ${NO_ANSWER}`);
        }
      }
      return { opened, notSent };
    },
    [views],
  );

  const viewOf = useCallback((intent: OnboardIntent) => views[writeKey(intent)], [views]);
  return useMemo(() => ({ viewOf, want, sendAll }), [viewOf, want, sendAll]);
}
