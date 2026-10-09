'use client';

import { useMemo } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { rangeLabel, seqAt } from '../model/replay/state';
import type { ReplayStore } from '../model/replay/store';

export interface TheaterActions {
  cue: (take: number) => void;
  roll: () => void;
  toggleLoop: () => void;
  markIn: () => void;
  markOut: () => void;
  togglePlay: () => void;
  step: (d: number) => void;
  seek: (i: number) => void;
}

/** Operator actions: each dispatches to the replay store and, where the prototype did, says so in the status bar. */
export function useTheaterActions(store: ReplayStore): TheaterActions {
  const { status } = useToast();
  return useMemo<TheaterActions>(() => {
    const d = store.dispatch;
    return {
      cue: (take) => d({ type: 'cue', take }),
      roll: () => {
        d({ type: 'roll' });
        const s = store.get();
        const r = rangeLabel(s);
        status(`Take ${s.take + 1}.${s.counts[s.take] ?? 1} · ${r.a} → ${r.b}`);
      },
      toggleLoop: () => {
        d({ type: 'toggleLoop' });
        status(store.get().loop ? 'Loop on' : 'Loop off');
      },
      markIn: () => {
        d({ type: 'markIn' });
        status(`In point ${seqAt(store.get().i, store.get().reel)}`);
      },
      markOut: () => {
        d({ type: 'markOut' });
        status(`Out point ${seqAt(store.get().i, store.get().reel)}`);
      },
      togglePlay: () => d({ type: 'toggle' }),
      step: (n) => d({ type: 'step', d: n }),
      seek: (i) => d({ type: 'seek', i }),
    };
  }, [store, status]);
}
