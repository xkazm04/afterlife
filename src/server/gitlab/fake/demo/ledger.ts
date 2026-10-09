// belay-ledger/events/<project-id>.jsonl for the demo group: a short hash chain (schemas/ledger.ts) that tells the
// day's story. Built with the schema's own `append`, so it verifies.
import { append, type LedgerEvent } from '@/schemas/ledger';
import { ACCOUNT, iso, LEDGERLINE_GID, MIN } from './ids';

type Body = Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>;

const mrEvent = (anchor: Date, atMs: number, agent: string, cls: string, kind: LedgerEvent['kind'], tier: Body['tier_at_time'], iid: number): Body => ({
  at: iso(anchor, atMs), agent, action_class: cls, kind, tier_at_time: tier,
  subject: { project_id: LEDGERLINE_GID, type: 'mr', iid }, payload_ref: `proofs/${iid}/${kind}.json`, observed_by: 'poll',
});

export function ledgerEvents(anchor: Date): LedgerEvent[] {
  const today = (hhmm: string): number => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    const d = new Date(anchor);
    d.setUTCHours(h, m, 0, 0);
    return d.getTime() - anchor.getTime();
  };
  const bodies: Body[] = [
    mrEvent(anchor, today('09:03'), ACCOUNT.patcher, 'dep-bump.patch', 'task_started', 'hands_off', 41),
    mrEvent(anchor, today('09:27'), ACCOUNT.patcher, 'dep-bump.patch', 'proof_verdict', 'hands_off', 41),
    // each guardrail_verdict states what its MR's guardrail note says (./ledgerline.ts): !41 pass, !44 block
    { ...mrEvent(anchor, today('09:28'), ACCOUNT.patcher, 'dep-bump.patch', 'guardrail_verdict', 'hands_off', 41), verdict: 'pass' },
    mrEvent(anchor, today('09:29'), ACCOUNT.patcher, 'dep-bump.patch', 'merged', 'hands_off', 41),
    { ...mrEvent(anchor, today('09:51'), ACCOUNT.patcher, 'dep-bump.patch', 'deployed', 'hands_off', 41), environment: { name: 'production', tier: 'production' } },
    { ...mrEvent(anchor, -4 * MIN - 2000, ACCOUNT.gardener, 'patch-bump', 'guardrail_verdict', 'supervised', 44), verdict: 'block' },
    { ...mrEvent(anchor, -4 * MIN, ACCOUNT.gardener, 'patch-bump', 'tier_decision', 'quarantined', 44), observed_by: 'ci_job' },
  ];
  const chain: LedgerEvent[] = [];
  for (const b of bodies) chain.push(append(chain, b));
  return chain;
}

export const ledgerJsonl = (anchor: Date): string => ledgerEvents(anchor).map((e) => JSON.stringify(e)).join('\n') + '\n';
