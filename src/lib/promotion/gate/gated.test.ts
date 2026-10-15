// trust-policy.yml's `gated: all` on a promotion step, read by rulesOf exactly as guardrail_blocks is (absent: no row), and
// the words of the gate last seen. The repo's policy sets it on supervised_to_hands_off: Hands-off is where acting alone
// happens. promotion.test.ts and rules.test.ts pin the rows of a policy without it.
import fs from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { parsePolicy } from '../../../../engine/policy/load';
import { repoPolicy, rulesOf } from '@/server/data/policy';
import type { PolicyRules } from '@/server/data/types';
import { freshestGate, gateSeenText, NOT_RECORDED, promotion, whyNot, type Counters } from '..';
import { ungated } from './ungated';

const RULES = repoPolicy() as PolicyRules;
const text = fs.readFileSync('policy/trust-policy.yml', 'utf8');
const read = (yaml: string) => rulesOf(parsePolicy(parse(yaml))) as PolicyRules;
const rec = (o: Partial<Counters> = {}): Counters => ({ accepted: 16, needed: null, noEdit: 0.94, cleanDays: 14, reverts: 0, guardrailBlocks: 0, window: 5, ...o });
const toHandsOff = (o: Partial<Counters>, rules: PolicyRules = RULES) => promotion({ tier: 'supervised', ceiling: 'hands_off', record: rec(o) }, 'exploit-test', rules);
const gatedRow = (p: ReturnType<typeof promotion>) => (p.kind === 'eligible' || p.kind === 'notyet' ? p.rules.find((r) => r.name === 'gated outputs') : undefined);

describe('rulesOf reads gated: all', () => {
  it('on supervised_to_hands_off in the repo policy, and on no other step', () => {
    expect([RULES.toHandsOff.gated, RULES.toSupervised.gated]).toEqual(['all', undefined]);
  });
  it('absent, or any other value: no key, so no row (today’s rows unchanged)', () => {
    for (const yaml of [text.replace(', gated: all', ''), text.replace(', gated: all', ', gated: some')]) {
      const rules = read(yaml);
      expect('gated' in rules.toHandsOff).toBe(false);
      expect(toHandsOff({ gated: 3 }, rules)).toEqual(toHandsOff({ gated: 3 }, ungated(RULES)));
      expect(gatedRow(toHandsOff({}, rules))).toBeUndefined();
    }
  });
  it('on assisted_to_supervised too, when a policy sets it there', () => {
    const rules = read(text.replace('window_last: 5 }', 'window_last: 5, gated: all }'));
    const p = promotion({ tier: 'assisted', ceiling: 'supervised', record: rec({ accepted: 5, gated: 4 }) }, 'repro', rules);
    expect([p.kind, whyNot(p)]).toEqual(['notyet', 'gated outputs is not met (4 / 5)']);
  });
});

describe('the gated outputs row', () => {
  it('met only when every accepted output was gated', () => {
    expect([toHandsOff({ gated: 16 }).kind, gatedRow(toHandsOff({ gated: 16 }))]).toEqual(['eligible', { name: 'gated outputs', value: '16 / 16', met: true, cells: [16, 16] }]);
    expect([toHandsOff({ gated: 15 }).kind, whyNot(toHandsOff({ gated: 15 }))]).toEqual(['notyet', 'gated outputs is not met (15 / 16)']);
  });
  it('not recorded when nothing states it (null, or a record that never says), and never met', () => {
    for (const p of [toHandsOff({ gated: null }), toHandsOff({})]) {
      expect(gatedRow(p)).toEqual({ name: 'gated outputs', value: NOT_RECORDED, met: false });
      expect(whyNot(p)).toBe('gated outputs is not recorded: no task or ledger event states it');
    }
  });
});

describe('the gate last seen, in words', () => {
  const g = { iid: 41, tierAtTime: 'hands_off' as const, at: '2026-10-06T09:29:00.000Z' };
  const now = new Date('2026-10-06T14:22:00.000Z');
  it('last seen: the MR, its tier, its age (none before the page has a clock)', () => {
    expect(gateSeenText(g, '2026-10-01T00:00:00.000Z', now)).toBe('Gate last seen !41 at Hands-off, 4.9 h ago');
    expect(gateSeenText(g, null, null)).toBe('Gate last seen !41 at Hands-off');
  });
  it('not seen since the record’s since; not read: nothing to say', () => {
    expect(gateSeenText(null, '2026-09-20T08:00:00.000Z', now)).toBe('Gate not seen since 2026-09-20');
    expect(gateSeenText(null, null, now)).toBe('Gate not seen');
    expect(gateSeenText(undefined, '2026-09-20', now)).toBeNull();
  });
  it('a track shows its freshest', () => {
    const older = { ...g, iid: 39, at: '2026-10-05T16:10:00.000Z' };
    expect(freshestGate([{ gateSeen: older }, { gateSeen: g }, { gateSeen: null }, {}])).toEqual(g);
    expect(freshestGate([{ gateSeen: null }, {}])).toBeNull();
  });
});
