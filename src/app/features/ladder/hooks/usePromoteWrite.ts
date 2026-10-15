'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PromoteAsk } from '../model/rules/promote';
import type { Tier } from '../model/types';
import { askPromote, promoteIntent, type PromoteView } from '../write/promote';
import { writeKey } from '../write/revoke';

export interface PromoteWrites {
  /** The exact write behind promoting `id` to `to`, as the server planned it, or the MR it opened. Undefined while asked. */
  viewOf: (id: string, to: Tier) => PromoteView | undefined;
  /** Replace one view: the new preview of a "changed" answer, a refusal's reason, or the MR a done answer named. */
  put: (id: string, to: Tier, view: PromoteView) => void;
  /** tier-state.yml moved (a revoke landed): every preview is stale. An MR already opened stays shown as opened. */
  clear: () => void;
}

/**
 * The promotion on screen. The class in view is asked for as soon as the promotion rule calls it eligible, or it is
 * quarantined (a re-admission), so the class page and the dock show the server's exact commands and tier-state.yml diff
 * before p can send them. `want` null (any other class): nothing is asked.
 */
export function usePromoteWrite(project: string, want: PromoteAsk | null): PromoteWrites {
  const [views, setViews] = useState<Readonly<Record<string, PromoteView>>>({});
  /** Bumped by `clear`, so the promotion in view is asked for again even when the selection did not move. */
  const [round, setRound] = useState(0);
  const asked = useRef(new Set<string>());
  /** The promotions the server answered done: their MR stays on screen and they are never asked for again. */
  const sent = useRef(new Set<string>());
  const generation = useRef(0);

  const put = useCallback((id: string, to: Tier, view: PromoteView) => {
    const key = writeKey(id, to);
    asked.current.add(key);
    if (view.kind === 'sent') sent.current.add(key);
    setViews((v) => ({ ...v, [key]: view }));
  }, []);
  const clear = useCallback(() => {
    generation.current += 1;
    asked.current = new Set(sent.current);
    setViews((v) => Object.fromEntries(Object.entries(v).filter(([, x]) => x.kind === 'sent')));
    setRound((r) => r + 1);
  }, []);
  const viewOf = useCallback((id: string, to: Tier) => views[writeKey(id, to)], [views]);

  const id = want?.id;
  const to = want?.to;
  const proposal = want?.proposal;
  useEffect(() => {
    if (!id || !to) return;
    const key = writeKey(id, to);
    if (asked.current.has(key)) return;
    asked.current.add(key);
    const gen = generation.current;
    void askPromote(promoteIntent(project, id, to, proposal)).then((view) => {
      if (gen === generation.current) setViews((v) => ({ ...v, [key]: view }));
    });
  }, [project, id, to, proposal, round]);

  return { viewOf, put, clear };
}
