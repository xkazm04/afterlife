// Live "Who acted" and "All moves" from the project's own belay-ledger: the moves a class page speaks of, in chain order,
// timed on the rail within a day, none marked demo. The fake's chain maps to its five moves.
import { describe, expect, it } from 'vitest';
import { append, type LedgerEvent } from '@/schemas/ledger';
import { ledgerEvents } from '@/server/gitlab/fake/demo';
import { SEED_NOW } from '@/server/index/seed/parse';
import { wallTime } from '../../model/clock';
import { liveLedgerEntries } from './ledgerEntries';

describe('liveLedgerEntries', () => {
  it('maps the tier decision, the guardrail and proof verdicts and the merge; task starts and deployments are not moves', () => {
    const out = liveLedgerEntries(ledgerEvents(SEED_NOW), SEED_NOW);
    expect(out.map((e) => [e.ids, e.actor, e.text])).toEqual([
      [['dep-bump.patch'], 'proof job', 'proof verdict on !41'],
      [['dep-bump.patch'], 'guardrail job', 'pass on !41'],
      [['dep-bump.patch'], 'ai-patcher-acme-lab', '!41 merged at Hands-off'],
      [['patch-bump'], 'guardrail job', 'block on !44'],
      [['patch-bump'], 'tier-gate job', '!44 gated at Quarantined'],
    ]);
    expect(out.every((e) => e.kind === 'gitlab' && e.where === 'GitLab' && !e.demo)).toBe(true);
    expect(out.find((e) => e.text === 'block on !44')?.quoteMr).toBe('!44');
  });

  it('a decision states the revision it read and what the sweep withdrew', () => {
    const chain = ledgerEvents(SEED_NOW);
    const last = chain.at(-1)!;
    const e = append(chain, { ...last, subject: { ...last.subject, iid: 45 }, tier_at_time: 'supervised', state_rev: 'c1'.repeat(20), withdrew: ['approval', 'auto_merge'] } as Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>);
    expect(liveLedgerEntries([...chain, e], SEED_NOW).at(-1)?.text).toBe('!45 gated at Supervised · read tier-state.yml @ c1c1c1c1 · withdrew the approval and the auto-merge');
  });

  it('within a day it is a clock time on the rail; older, "N d ago"', () => {
    const [first] = ledgerEvents(SEED_NOW);
    const at = (iso: string) => liveLedgerEntries([{ ...first!, kind: 'merged', at: iso }], SEED_NOW)[0]?.t;
    expect(at(SEED_NOW.toISOString())).toBe(wallTime(SEED_NOW));
    expect(at(new Date(SEED_NOW.getTime() - 3 * 86_400_000 - 1000).toISOString())).toBe('3 d ago');
  });
});
