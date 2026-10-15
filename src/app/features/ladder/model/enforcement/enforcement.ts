// Where a revoke was enforced, as the class page says it: three facts (committed, read, withdrawn) and an alarm. Live, from
// the poll's receipt (src/schemas/receipt.ts): what belay-policy's commit list and the ledger's tier decisions state. A
// revoke still pending (this session's, no receipt has read it yet) says only what is known. Demo: the simulated read
// settles this session's revoke, and every fact is marked simulated.
import { TIER_META } from '@/lib/tiers';
import { delayText } from '../state/commit';
import type { ClassRow } from '../types';

export interface EnforcementFact {
  label: 'Committed' | 'Read' | 'Withdrawn';
  text: string;
}

export interface Enforcement {
  facts: EnforcementFact[];
  /** "!52's gate granted Hands-off after the commit": a gate read the record and still granted more. Null: none. */
  alarm: string | null;
  /** Demo: nothing here ran. */
  simulated: boolean;
}

const AWAITING = 'awaiting the next gated MR';
const WORD = { approval: 'approval', auto_merge: 'auto-merge' } as const;
const short = (sha: string): string => sha.slice(0, 8);

/** Null when there is nothing to say: no receipt, and no revoke of this session pending or settled. `live`: not the demo. */
export function enforcementOf(c: ClassRow, live: boolean): Enforcement | null {
  const r = live ? c.receipt : undefined;
  // a pending revoke whose commit the receipt does not name yet: the receipt is of the record before it
  if (c.pending && !(r && r.commit.startsWith(c.pending))) {
    return { facts: [{ label: 'Committed', text: c.pending }, { label: 'Read', text: AWAITING }, { label: 'Withdrawn', text: 'nothing yet' }], alarm: null, simulated: !live };
  }
  if (r) {
    const read = r.readIid !== null ? `at !${r.readIid}${r.delaySec !== null ? `, ${delayText(r.delaySec)} after the commit` : ''}` : AWAITING;
    const back = r.withdrew.map((w) => `${WORD[w.what]} on !${w.iid}`);
    return {
      facts: [{ label: 'Committed', text: short(r.commit) }, { label: 'Read', text: read }, { label: 'Withdrawn', text: back.length ? back.join(' · ') : 'nothing' }],
      alarm: r.alarm ? `!${r.alarm.iid}'s gate granted ${TIER_META[r.alarm.tier].name} after the commit` : null,
      simulated: false,
    };
  }
  if (c.simRead) {
    return {
      facts: [
        { label: 'Committed', text: c.simRead.sha },
        { label: 'Read', text: `by the next MR pipeline at ${c.simRead.t}` },
        { label: 'Withdrawn', text: 'the approval the old tier had granted an open MR' },
      ],
      alarm: null,
      simulated: true,
    };
  }
  return null;
}
