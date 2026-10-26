'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hostRevalidate } from '@/components/shell/host/hooks/navigation';
import { requestShellRead } from '@/components/shell/live/sync';
import { PROBE_IDLE, fold, type ProbeState } from '../model/stream';
import type { StartFacts } from '../model/types';
import { readProbe } from './probeRun';
import { useElapsed } from './useElapsed';

export interface ProbeRun {
  state: ProbeState;
  running: boolean;
  sinceS: number;
  recheck: () => void;
}

/**
 * The probe stream's state: one run on arrival, then one per Re-check. A Re-check aborts the stream before it, and an
 * event that lands for an older run is dropped (the run token). When /start stands in for the app (live, not ready) and
 * the live node passes, the page is refreshed so the app it stood in for comes back: the layout's gate (a server read)
 * by the router, the screen host's screen under it (whose read failed while live was not ready) and the shell by a re-read.
 */
export function useProbe(facts: StartFacts): ProbeRun {
  const router = useRouter();
  const [state, setState] = useState<ProbeState>(PROBE_IDLE);
  const [running, setRunning] = useState(false);
  const [since, setSince] = useState<number | null>(null);
  const run = useRef<AbortController | null>(null);
  const url = `/api/start/probe${facts.rehearsal ? '?rehearse=not-ready' : ''}`;
  const comeBack = Boolean(facts.gate) && !facts.rehearsal;

  const recheck = useCallback(() => {
    run.current?.abort();
    const me = new AbortController();
    run.current = me;
    setState(PROBE_IDLE);
    setRunning(true);
    setSince(Date.now());
    const settle = () => {
      if (run.current !== me) return;
      setRunning(false);
      setSince(null);
    };
    void readProbe(url, me.signal, (e) => {
      if (run.current !== me) return;
      setState((s) => fold(s, e));
      if (e.t === 'done' || e.t === 'refused') settle(); // the last line settles it, whenever the connection closes
      if (e.t === 'done' && comeBack && e.read.nodes.live.state === 'pass') {
        router.refresh();
        hostRevalidate();
        requestShellRead();
      }
    }).finally(settle);
  }, [url, comeBack, router]);

  // One run on arrival (as the doctor runs when Setup loads); leaving aborts it, so a remount starts a fresh one.
  const ran = useRef(false);
  useEffect(() => {
    if (!ran.current) {
      ran.current = true;
      recheck();
    }
    return () => {
      ran.current = false;
      run.current?.abort();
    };
  }, [recheck]);

  return { state, running, sinceS: useElapsed(since), recheck };
}
