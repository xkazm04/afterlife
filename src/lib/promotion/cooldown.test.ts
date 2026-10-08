// cooldown_until in tier-state.yml (stamped by the tripwire and by a revoke from trust-policy.yml's cooldown_days): while
// it is ahead, the promotion rule carries a cooldown row that is not met until that date, so no class is eligible.
import { describe, expect, it } from 'vitest';
import { repoPolicy } from '@/server/data/policy';
import type { PolicyRules } from '@/server/data/types';
import { promotion, type Counters } from '.';

const RULES = repoPolicy() as PolicyRules;
const NOW = new Date('2026-10-21T12:00:00Z');
const supervisedReady: Counters = { accepted: 5, needed: null, noEdit: null, cleanDays: null, reverts: 0, guardrailBlocks: 0, window: 5 };
const handsOffReady: Counters = { accepted: 16, needed: 15, noEdit: 0.94, cleanDays: 14, reverts: 0 };
const toSupervised = (cooldownUntil: string | null, now = NOW) =>
  promotion({ tier: 'assisted', ceiling: 'supervised', record: supervisedReady, cooldownUntil }, 'exploit-test', RULES, now);

describe('the promotion cooldown', () => {
  it('while cooldown_until is ahead: a cooldown row, not met until that date, so not eligible', () => {
    const p = toSupervised('2026-10-28');
    expect(p.kind).toBe('notyet');
    if (p.kind !== 'notyet') return;
    expect(p.rules.at(-1)).toEqual({ name: 'cooldown', value: 'until 2026-10-28', met: false });
    expect(p.rules.slice(0, -1).every((r) => r.met)).toBe(true);
  });
  it('from that date on, no cooldown row: the counts decide', () => {
    const p = toSupervised('2026-10-28', new Date('2026-10-28T00:00:00Z'));
    expect(p.kind).toBe('eligible');
    if (p.kind === 'eligible') expect(p.rules.map((r) => r.name)).not.toContain('cooldown');
    expect(toSupervised(null).kind).toBe('eligible');
  });
  it('holds the Hands-off step too', () => {
    const p = promotion({ tier: 'supervised', ceiling: 'hands_off', record: handsOffReady, cooldownUntil: '2026-10-28' }, 'exploit-test', RULES, NOW);
    expect(p.kind).toBe('notyet');
    if (p.kind === 'notyet') expect(p.rules.find((r) => r.name === 'cooldown')).toEqual({ name: 'cooldown', value: 'until 2026-10-28', met: false });
  });
});
