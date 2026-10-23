'use client';

import type { GateSeen } from '@/lib/demo/types';
import { useNow } from '@/lib/clock/useNow';
import { gateSeenText } from '@/lib/promotion/gate/gateSeen';
import { Chip } from './chip/Chip';

const WHAT = "The latest tier_decision the belay-apply gate wrote for this class's holder since the record's counts began (read from belay-ledger)";

/**
 * "Gate last seen !41 at Hands-off, 4.9 h ago" or "Gate not seen since 2026-09-20". The age is read against `now` when
 * given (the demo's own clock), else the wall clock once mounted (none before: the server render has no age). `demo`: the
 * value is the demo's, illustrative (the demo has no ledger), marked so. Nothing when the gate is not read for the class.
 */
export function GateSeenLine({ gate, since, now, demo = false }: { gate: GateSeen | null | undefined; since?: string | null; now?: Date; demo?: boolean }) {
  const wall = useNow(60_000);
  const text = gateSeenText(gate, since, now ?? (wall === null ? null : new Date(wall)));
  if (!text) return null;
  return (
    <span title={WHAT}>
      {text}
      {demo ? (
        <>
          {' '}
          <Chip compact tone="unknown" title="Illustrative: the demo has no ledger, so this gate is the demo's own">
            demo
          </Chip>
        </>
      ) : null}
    </span>
  );
}
