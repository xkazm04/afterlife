import { useState } from 'react';
import type { StepView } from '../../model/view';
import { litRanks, segOf } from './nav';

/**
 * The sweep order of the segments lit by the latest render (nav.litRanks), kept until the lit set changes again: two
 * events landing in one render still sweep one after the other, never all at once. Adjusts state during render (no effect).
 */
export function useLitRanks(steps: readonly StepView[]): readonly number[] {
  const lit = steps.map((_, i) => segOf(steps, i) === 'lit');
  const sig = lit.map(Number).join('');
  const [seen, setSeen] = useState<{ sig: string; lit: readonly boolean[]; ranks: readonly number[] }>(() => ({ sig, lit, ranks: litRanks(null, lit) }));
  if (seen.sig !== sig) {
    const next = { sig, lit, ranks: litRanks(seen.lit, lit) };
    setSeen(next);
    return next.ranks;
  }
  return seen.ranks;
}
