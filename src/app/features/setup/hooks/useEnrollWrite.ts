'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ActionResponse } from '@/server/actions/types';
import { mrOf, NO_ANSWER, outcomeOf } from '@/server/actions/words';
import { askEnroll, sendEnroll } from '../write/enroll';
import type { WriteView } from '../write/arm';
import { oneAtATime } from './armFlow';

/** What a sent enrollment opened: the MR GitLab named (null when it named none, or demo mode simulated it). */
export interface EnrollSent {
  mr: string | null;
  url: string | null;
  simulated: boolean;
}

export interface EnrollWrites {
  /** The exact policy MR behind enrolling a track, as the server planned it. Undefined while asked. */
  viewOf: (id: string) => WriteView | undefined;
  /** The MR a confirm opened for the track, once one did. */
  sentOf: (id: string) => EnrollSent | undefined;
  /** Ask for that write once (previewAction). */
  want: (id: string) => void;
  /** The click: confirm the preview on screen. Answers the line the toast shows. */
  send: (id: string) => Promise<string>;
}

/** The enrollment writes on screen, held by the Setup provider so a sent MR stays named across the track pages. */
export function useEnrollWrite(project: string): EnrollWrites {
  const [views, setViews] = useState<Readonly<Record<string, WriteView>>>({});
  const [sent, setSent] = useState<Readonly<Record<string, EnrollSent>>>({});
  const asked = useRef(new Set<string>());

  const want = useCallback(
    (id: string) => {
      if (asked.current.has(id)) return;
      asked.current.add(id);
      void askEnroll(project, id).then((view) => setViews((v) => ({ ...v, [id]: view })));
    },
    [project],
  );
  // The tracks with a confirm out: a second click in that window would confirm the same preview again (as armClick).
  const out = useRef(new Set<string>());
  const confirm = useCallback(
    async (id: string) => {
      const what = `enroll ${id}`;
      let r: ActionResponse | null;
      try {
        r = await sendEnroll(project, id, views[id]);
      } catch {
        return `${what}: ${NO_ANSWER}`;
      }
      const o = r ? outcomeOf(r, what) : null;
      if (!r || !o) return `Nothing sent · ${what}: the exact MR is not on screen yet`;
      if (o.status === 'changed') setViews((v) => ({ ...v, [id]: { kind: 'preview', preview: o.preview } }));
      // a refused or failed confirm leaves no write to send again from this screen: its preview no longer stands
      if (o.status === 'refused' || o.status === 'failed') setViews((v) => ({ ...v, [id]: { kind: 'refused', reason: o.text } }));
      if (o.status === 'done' && r.status === 'done') {
        const mr = mrOf(r.results);
        setSent((s) => ({ ...s, [id]: { mr, url: r.results.find((x) => x.made === mr)?.url ?? null, simulated: o.simulated } }));
      }
      return o.text;
    },
    [project, views],
  );
  const send = useCallback((id: string) => oneAtATime(out.current, id, `Nothing sent · enroll ${id}: its confirm is still out`, () => confirm(id)), [confirm]);
  const viewOf = useCallback((id: string) => views[id], [views]);
  const sentOf = useCallback((id: string) => sent[id], [sent]);
  return useMemo(() => ({ viewOf, sentOf, want, send }), [viewOf, sentOf, want, send]);
}
