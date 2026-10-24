'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { firstOpen, unprobed } from '../model/judge';
import { NODES } from '../model/nodes';
import type { NodeKey, ProbeAnswer, TraceFacts, TraceRead } from '../model/types';

const ORDER = NODES.map((n) => n.key);

export interface TraceView {
  nodes: TraceRead['nodes'];
  caps: TraceRead['caps'];
  at: string | null;
  source: TraceRead['source'] | null;
  refused: string | null;
  checking: boolean;
  /** Bumped on every answer: the wire replays its light along the nodes. */
  round: number;
  selected: NodeKey;
  select: (k: NodeKey) => void;
  recheck: () => void;
}

/**
 * The wire's state: the server's facts first (only the live node is known without a probe), then each Re-check's answer.
 * The probe runs once on arrival, as the doctor does when Setup loads. When Trace stands in for the app (live, not
 * ready) and the live node passes, the page is refreshed so the app it stood in for comes back.
 */
export function useTrace(facts: TraceFacts): TraceView {
  const router = useRouter();
  const [read, setRead] = useState<TraceRead | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<NodeKey | null>(null);
  const [checking, setChecking] = useState(false);
  const ran = useRef(false);

  const recheck = useCallback(() => {
    setChecking(true);
    fetch(`/api/trace${facts.rehearsal ? '?rehearse=not-ready' : ''}`, { cache: 'no-store' })
      .then((r) => r.json() as Promise<ProbeAnswer>)
      .then((a) => {
        if (a.status === 'refused') {
          setRefused(a.reason);
          return;
        }
        setRefused(null);
        setRead(a.read);
        setRound((r) => r + 1);
        setPicked(null);
        if (facts.gate && !facts.rehearsal && a.read.nodes.live.state === 'pass') router.refresh();
      })
      .catch((e: unknown) => setRefused(`the server did not answer: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => setChecking(false));
  }, [facts.gate, facts.rehearsal, router]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    recheck();
  }, [recheck]);

  const nodes = read?.nodes ?? unprobed(facts);
  return {
    nodes,
    caps: read?.caps ?? null,
    at: read?.at ?? null,
    source: read?.source ?? null,
    refused,
    checking,
    round,
    selected: picked ?? firstOpen(nodes, ORDER),
    select: setPicked,
    recheck,
  };
}
