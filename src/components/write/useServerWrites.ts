'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ActionIntent, ActionPreview, ActionResponse } from '@/server/actions/types';

/** One write as the screen shows it: being planned, planned (the exact commands), or refused with the server's reason. */
export type WriteEntry = { status: 'planning' } | { status: 'preview'; preview: ActionPreview } | { status: 'refused'; reason: string };

type Planned = { sig: string; entry: WriteEntry };
const PLANNING: WriteEntry = { status: 'planning' };

/**
 * Preview when a write is shown, confirm when it is acted on. Pass the intents the screen is showing, by key; each is
 * planned on the server (nothing runs) and kept until its intent changes. `confirm(key)` sends the plan the operator saw
 * (by its previewId): if the server's plan moved meanwhile, nothing runs and the new preview replaces the old one.
 */
export function useServerWrites(intents: Readonly<Record<string, ActionIntent | null>>) {
  const [planned, setPlanned] = useState<Record<string, Planned>>({});
  const asked = useRef<Record<string, string>>({});
  const wanted = JSON.stringify(intents);

  useEffect(() => {
    const current = JSON.parse(wanted) as Record<string, ActionIntent | null>;
    for (const [key, intent] of Object.entries(current)) {
      const sig = JSON.stringify(intent);
      if (!intent || asked.current[key] === sig) continue;
      asked.current[key] = sig;
      const settle = (entry: WriteEntry) => setPlanned((p) => (asked.current[key] === sig ? { ...p, [key]: { sig, entry } } : p));
      previewAction(intent).then(
        (r) => settle(r.status === 'refused' ? { status: 'refused', reason: r.reason } : { status: 'preview', preview: r.preview }),
        () => settle({ status: 'refused', reason: 'the server could not be reached' }),
      );
    }
  }, [wanted]);

  // an entry counts only for the intent it was planned for; a newer intent reads as planning until its reply lands
  const current = JSON.parse(wanted) as Record<string, ActionIntent | null>;
  const entries: Record<string, WriteEntry> = {};
  for (const [key, intent] of Object.entries(current)) {
    if (!intent) continue;
    const p = planned[key];
    entries[key] = p && p.sig === JSON.stringify(intent) ? p.entry : PLANNING;
  }
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  });

  const confirm = useCallback(
    async (key: string): Promise<ActionResponse> => {
      const intent = (JSON.parse(wanted) as Record<string, ActionIntent | null>)[key];
      const entry = entriesRef.current[key];
      if (!intent) return { status: 'refused', reason: 'nothing to send' };
      if (!entry || entry.status !== 'preview') {
        return { status: 'refused', reason: entry?.status === 'refused' ? entry.reason : 'the commands are still being planned' };
      }
      const r = await confirmAction(intent, entry.preview.previewId);
      const sig = JSON.stringify(intent);
      if (r.status === 'changed') setPlanned((p) => ({ ...p, [key]: { sig, entry: { status: 'preview', preview: r.preview } } }));
      if (r.status === 'refused') setPlanned((p) => ({ ...p, [key]: { sig, entry: { status: 'refused', reason: r.reason } } }));
      return r;
    },
    [wanted],
  );

  return { entries, confirm };
}

/**
 * Plan and confirm in one gesture, for a write whose exact effect the screen already showed (a menu item, a key on a
 * selected row). The server still plans it first, and refuses anything the operator may not do.
 */
export async function sendNow(intent: ActionIntent): Promise<ActionResponse> {
  const p = await previewAction(intent);
  return p.status === 'preview' ? confirmAction(intent, p.preview.previewId) : p;
}
