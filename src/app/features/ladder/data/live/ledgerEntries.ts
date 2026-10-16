// Live: the Ladder's "Who acted" and "All moves" from the deep project's own belay-ledger (ds.getLedger(), verified on
// import), mapped here on the server (@/schemas/ledger imports node:crypto). Only the moves a class page speaks of are
// kept: the gate's tier decision (with the tier-state.yml revision it read and what the sweep withdrew), the guardrail's
// verdict, the proof verdict and the merge. Nothing here is the demo's, so no entry carries the demo mark.
import type { LedgerEvent } from '@/schemas/ledger';
import { TIER_META } from '@/lib/tiers';
import { clockLabel } from '../../model/clock';
import type { LedgerSeedEntry } from '../ledgerSeed';

/** The newest events shown: a class page reads its own, the rail only the timed ones. */
export const LIVE_LEDGER_MAX = 200;
const WITHDRAWN = { approval: 'the approval', auto_merge: 'the auto-merge' } as const;

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

/**
 * Oldest first, as the ledger runs. Each entry carries the event's instant (`at`, epoch ms) and its label in the screen's
 * zone `tz` (an IANA name: the one loadLadderData puts in the seed) as of `now`: "14:20:03" within a day, else "3 d ago".
 * A guardrail block quotes its MR's finding (resolved like the seed's).
 */
export function liveLedgerEntries(events: readonly LedgerEvent[], now: Date, tz: string): LedgerSeedEntry[] {
  return events.slice(-LIVE_LEDGER_MAX).flatMap((e): LedgerSeedEntry[] => {
    const s = said(e);
    if (!s) return [];
    const quote = e.kind === 'guardrail_verdict' && e.verdict === 'block' ? { quoteMr: `!${e.subject.iid}` } : {};
    const at = Date.parse(e.at);
    return [{ at, t: clockLabel(at, tz, now), ids: [e.action_class], actor: s.actor, where: 'GitLab', kind: 'gitlab', text: s.text, ...quote }];
  });
}
