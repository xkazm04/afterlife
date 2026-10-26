'use client';

import { useCallback, useRef, useState } from 'react';
import type { DeriveAnswer } from '@/server/start/wire';
import { derive } from '../model/stack/api';
import { useElapsed } from './useElapsed';

export interface RepoRun {
  picked?: string;
  deriving: boolean;
  answer?: DeriveAnswer;
  error?: string;
  sinceS: number;
  pick: (root: string) => void;
}

/**
 * Repo first: picking a repo asks POST /api/start/derive for what its git remote says (host, namespace, group id) and
 * hands the same root to the stack's proposal, which runs alongside. A newer pick drops the older answer.
 */
export function useRepo(onPick: (root: string) => void): RepoRun {
  const [picked, setPicked] = useState<string>();
  const [got, setGot] = useState<{ root: string; answer?: DeriveAnswer; error?: string } | null>(null);
  const [since, setSince] = useState<number | null>(null);
  const run = useRef<AbortController | null>(null);

  const pick = useCallback(
    (root: string) => {
      run.current?.abort();
      const me = new AbortController();
      run.current = me;
      setPicked(root);
      setGot(null);
      setSince(Date.now());
      onPick(root);
      void derive(root, me.signal).then((a) => {
        if (run.current !== me) return;
        setGot(a.ok ? { root, answer: a.body } : { root, error: a.error.error });
        setSince(null);
      });
    },
    [onPick],
  );

  const mine = got?.root === picked ? got : null;
  return { picked, deriving: since !== null, answer: mine?.answer, error: mine?.error, sinceS: useElapsed(since), pick };
}
