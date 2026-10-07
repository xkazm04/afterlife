'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { askArm, writeKey, type WriteView } from '../write/arm';

export interface ArmWrites {
  /** The exact MR behind arming (or, `revert`, disarming) a track, as the server planned it. Undefined while asked. */
  viewOf: (id: string, revert: boolean) => WriteView | undefined;
  /** Ask for that write once (previewAction). Asking again is free until `clear`. */
  want: (id: string, revert: boolean) => void;
  /** Replace one view: the new preview of a "changed" answer. */
  put: (id: string, revert: boolean, view: WriteView) => void;
  /** A write was sent: every preview is now stale. Answers still in flight are dropped. */
  clear: () => void;
  /** Bumped by `clear`, so a section still in view asks for its write again. */
  round: number;
}

/** The arm and disarm writes on screen. The section that shows one asks for it when it comes into view. */
export function useArmWrite(project: string): ArmWrites {
  const [views, setViews] = useState<Readonly<Record<string, WriteView>>>({});
  const [round, setRound] = useState(0);
  const asked = useRef(new Set<string>());
  const generation = useRef(0);

  const want = useCallback(
    (id: string, revert: boolean) => {
      const key = writeKey(id, revert);
      if (asked.current.has(key)) return;
      asked.current.add(key);
      const gen = generation.current;
      void askArm(project, id, revert).then((view) => {
        if (gen === generation.current) setViews((v) => ({ ...v, [key]: view }));
      });
    },
    [project],
  );
  const put = useCallback((id: string, revert: boolean, view: WriteView) => {
    asked.current.add(writeKey(id, revert));
    setViews((v) => ({ ...v, [writeKey(id, revert)]: view }));
  }, []);
  const clear = useCallback(() => {
    generation.current += 1;
    asked.current.clear();
    setViews({});
    setRound((r) => r + 1);
  }, []);
  const viewOf = useCallback((id: string, revert: boolean) => views[writeKey(id, revert)], [views]);

  return useMemo(() => ({ viewOf, want, put, clear, round }), [viewOf, want, put, clear, round]);
}
