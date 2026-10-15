// Live: the Ladder's "Who acted" and "All moves" from the deep project's own belay-ledger (ds.getLedger(), verified on
// import), mapped here on the server (@/schemas/ledger imports node:crypto). Only the moves a class page speaks of are
// kept: the gate's tier decision (with the tier-state.yml revision it read and what the sweep withdrew), the guardrail's
// verdict, the proof verdict and the merge. Nothing here is the demo's, so no entry carries the demo mark.
import type { LedgerEvent } from '@/schemas/ledger';
import { TIER_META } from '@/lib/tiers';
import { wallTime } from '../../model/clock';
import type { LedgerSeedEntry } from '../ledgerSeed';

/** The newest events shown: a class page reads its own, the rail only the timed ones. */
export const LIVE_LEDGER_MAX = 200;
const DAY_MS = 86_400_000;
const WITHDRAWN = { approval: 'the approval', auto_merge: 'the auto-merge' } as const;

/** "14:20:03" within a day of `now` (on the rail, to scale), else "3 d ago". */
const timeOf = (at: string, now: Date): string => {
  const ms = Date.parse(at);
  const age = now.getTime() - ms;
  return age < DAY_MS ? wallTime(new Date(ms)) : `${Math.max(1, Math.floor(age / DAY_MS))} d ago`;
};

function said(e: LedgerEvent): { actor: string; text: string } | null {
  const mr = `!${e.subject.iid}`;
  switch (e.kind) {
    case 'tier_decision': {
      const rev = e.state_rev ? ` · read tier-state.yml @ ${e.state_rev.slice(0, 8)}` : '';
      const back = e.withdrew ? ` · withdrew ${e.withdrew.map((w) => WITHDRAWN[w]).join(' and ')}` : '';
      return { actor: 'tier-gate job', text: `${mr} gated at ${TIER_META[e.tier_at_time].name}${rev}${back}` };
    }
    case 'guardrail_verdict':
      return { actor: 'guardrail job', text: `${e.verdict ?? 'a verdict'} on ${mr}` };
    case 'proof_verdict':
      return { actor: 'proof job', text: `proof verdict on ${mr}` };
    case 'merged':
      return { actor: e.agent, text: `${mr} merged at ${TIER_META[e.tier_at_time].name}` };
    default:
      return null;
  }
}

/** Oldest first, as the ledger runs. A guardrail block quotes its MR's finding (resolved like the seed's). */
export function liveLedgerEntries(events: readonly LedgerEvent[], now: Date): LedgerSeedEntry[] {
  return events.slice(-LIVE_LEDGER_MAX).flatMap((e): LedgerSeedEntry[] => {
    const s = said(e);
    if (!s) return [];
    const quote = e.kind === 'guardrail_verdict' && e.verdict === 'block' ? { quoteMr: `!${e.subject.iid}` } : {};
    return [{ t: timeOf(e.at, now), ids: [e.action_class], actor: s.actor, where: 'GitLab', kind: 'gitlab', text: s.text, ...quote }];
  });
}
