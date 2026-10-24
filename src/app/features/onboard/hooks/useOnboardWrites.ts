'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { OnboardIntent } from '../model/batch';
import { sendEach, type Sent } from '../write/send';
import { askWrite, writeKey, type WriteView } from '../write/write';

export interface OnboardWrites {
  /** The exact MR behind a write, as the server planned it. Undefined while asked. */
  viewOf: (intent: OnboardIntent) => WriteView | undefined;
  /** Ask for that write once (previewAction). Never sends anything. */
  want: (intent: OnboardIntent) => void;
  /**
   * The click: confirm every write whose preview is on screen, one at a time (write/send.ts). Answers what each confirmed
   * write opened (by project id) and one line per write that did not go, for the status line.
   */
  sendAll: (intents: readonly OnboardIntent[]) => Promise<Sent>;
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
    (intents: readonly OnboardIntent[]) => sendEach(intents, (k) => views[k], (k, view) => setViews((v) => ({ ...v, [k]: view }))),
    [views],
  );

  const viewOf = useCallback((intent: OnboardIntent) => views[writeKey(intent)], [views]);
  return useMemo(() => ({ viewOf, want, sendAll }), [viewOf, want, sendAll]);
}
