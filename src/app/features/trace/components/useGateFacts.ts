'use client';

import { useEffect, useState } from 'react';
import { readStream } from '@/components/shell/host/hooks/readStream';
import { screenUrl } from '@/components/shell/host/model/wire';
import type { ShellData } from '@/components/shell/ShellContext';
import type { TraceFacts } from '../model/types';

/** The shell already says live before the first poll: the gate is up before Trace's facts are read. */
export const shellNotReady = (data: ShellData | null): boolean => data?.mode === 'live' && data.group === 'first poll not finished';

/** What the gate knows: whether to cover the column, and the facts it covers it with once read. */
export interface GateRead {
  cover: boolean;
  facts?: TraceFacts;
}

/** Pure: the gate is up while live and either the shell says not ready (facts still coming) or the facts name a gate. */
export function gateOf(data: ShellData | null, facts: TraceFacts | undefined): GateRead {
  if (data?.mode !== 'live') return { cover: false };
  if (facts) return { cover: facts.gate !== null, facts };
  return { cover: shellNotReady(data) };
}

/**
 * The live gate's facts: Trace's own `facts` slice, read over the screen stream whenever the shell's data changes
 * (a fresh shell read after the first poll, a re-check that passed). Demo reads nothing: it is never gated.
 */
export function useGateFacts(data: ShellData | null): GateRead {
  const [facts, setFacts] = useState<{ for: ShellData; facts: TraceFacts } | null>(null);
  const live = data?.mode === 'live';
  useEffect(() => {
    if (!live || !data) return;
    const ctl = new AbortController();
    readStream(screenUrl('trace', {}), ctl.signal, (line) => {
      if (line.slice === 'facts' && line.status === 'ok' && line.data) setFacts({ for: data, facts: line.data as unknown as TraceFacts });
    }).catch(() => undefined); // unreadable: the shell's own word decides (gateOf)
    return () => ctl.abort();
  }, [live, data]);
  // facts read for an older shell value still say what is known until the new read lands
  return gateOf(data, facts?.facts);
}
