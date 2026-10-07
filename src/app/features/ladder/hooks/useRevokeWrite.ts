'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { revokeTarget } from '../model/rules/tiers';
import type { ClassRow, Tier } from '../model/types';
import { askRevoke, writeKey, type WriteView } from '../write/revoke';

export interface RevokeWrites {
  /** The exact write behind revoking `id` to `to`, as the server planned it. Undefined while it is being asked. */
  viewOf: (id: string, to: Tier) => WriteView | undefined;
  /** Ask for that write once (previewAction). Asking again is free until `clear`. */
  want: (id: string, to: Tier) => void;
  /** Replace one view: the new preview of a "changed" answer, or the reason of a refusal. */
  put: (id: string, to: Tier, view: WriteView) => void;
  /** A write landed: every preview is now stale. Answers still in flight are dropped. */
  clear: () => void;
}

/**
 * The writes on screen. The selected class's revoke target (or the target the menu highlights) is asked for as soon as
 * it is in view, so the inspector and the dock show the server's exact commands and diff before r can send them.
 */
export function useRevokeWrite(project: string, selected: ClassRow | undefined, hoverTo: Tier | null): RevokeWrites {
  const [views, setViews] = useState<Readonly<Record<string, WriteView>>>({});
  /** Bumped by `clear`, so the write in view is asked for again even when the selection did not move. */
  const [round, setRound] = useState(0);
  const asked = useRef(new Set<string>());
  const generation = useRef(0);

  const want = useCallback(
    (id: string, to: Tier) => {
      const key = writeKey(id, to);
      if (asked.current.has(key)) return;
      asked.current.add(key);
      const gen = generation.current;
      void askRevoke(project, id, to).then((view) => {
        if (gen === generation.current) setViews((v) => ({ ...v, [key]: view }));
      });
    },
    [project],
  );
  const put = useCallback((id: string, to: Tier, view: WriteView) => {
    asked.current.add(writeKey(id, to));
    setViews((v) => ({ ...v, [writeKey(id, to)]: view }));
  }, []);
  const clear = useCallback(() => {
    generation.current += 1;
    asked.current.clear();
    setViews({});
    setRound((r) => r + 1);
  }, []);
  const viewOf = useCallback((id: string, to: Tier) => views[writeKey(id, to)], [views]);

  const id = selected?.id;
  const to = selected ? (hoverTo ?? revokeTarget(selected.tier)) : null;
  useEffect(() => {
    if (id && to) want(id, to);
  }, [id, to, want, round]);

  return { viewOf, want, put, clear };
}
