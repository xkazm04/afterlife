'use client';

import { useMemo, useRef } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { outcomeText, wentThrough } from '@/components/write/outcome';
import { useServerWrites } from '@/components/write/useServerWrites';
import type { Gap } from '../model/ctx';
import { gapIntent } from '../model/flow/intent';

/**
 * "Send as you" through the server: while the sheet is open, each picked MR gap is planned (the sheet shows the server's
 * commands); Send confirms them one by one and moves the flow on only if every one went through. A probe sends nothing.
 * If one fails after others went through, the toast names what was sent and what was not.
 */
export function useGapWrites(open: boolean, gaps: readonly Gap[], onSent: () => void) {
  const { status } = useToast();
  const intents = useMemo(() => (open ? Object.fromEntries(gaps.map((g) => [g.id, gapIntent(g)])) : {}), [open, gaps]);
  const { entries, confirm } = useServerWrites(intents);
  const busy = useRef(false);
  const mrGaps = gaps.filter((g) => intents[g.id]);
  const ready = mrGaps.every((g) => entries[g.id]?.status === 'preview');

  const send = async () => {
    if (!ready || busy.current) return;
    busy.current = true;
    const done: string[] = [];
    try {
      for (const g of mrGaps) {
        const r = await confirm(g.id);
        if (!wentThrough(r)) {
          status(`${done.length ? `Sent ${done.join(', ')}; ` : ''}${g.id} ${outcomeText(r)}`);
          return;
        }
        done.push(g.id);
      }
      onSent();
      const demo = mrGaps.some((g) => { const e = entries[g.id]; return e?.status === 'preview' && e.preview.mode === 'demo'; });
      status(`${mrGaps.length} draft MR${mrGaps.length === 1 ? '' : 's'} confirmed${demo ? ', simulated in demo mode (nothing was executed)' : ', opened as you'}`);
    } finally {
      busy.current = false;
    }
  };
  return { entries, ready, send };
}
