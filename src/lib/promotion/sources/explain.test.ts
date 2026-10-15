// explain() lists what one count read, from the record's sources alone: the rows a count backs, where a count starts, a
// capped list said to be capped, and the facts a null counter is missing.
import { describe, expect, it } from 'vitest';
import type { CountedOutput, RecordSources } from '@/lib/demo/sources';
import { countKeyOf, explain, mrHref } from './explain';

const out = (iid: number, outcome: CountedOutput['outcome'], inWindow = true, over: Partial<CountedOutput> = {}): CountedOutput =>
  ({ iid, outcome, at: `2026-10-0${iid % 9 + 1}T10:00:00.000Z`, inWindow, edited: outcome === 'merged' ? false : null, gated: outcome === 'merged' ? true : null, ...over });
const s: RecordSources = {
  since: '2026-09-26T10:00:00.000Z', window: 3, web: null,
  outputs: [out(9, 'merged'), out(8, 'reverted'), out(7, 'merged', true, { edited: true, gated: false }), out(6, 'merged', false)],
  total: 4, excluded: [{ iid: 6, reason: 'outside_window' }], blocks: [],
  missing: [{ iid: null, fact: 'revert_policy' }, { iid: 7, fact: 'tier_decision' }],
};

describe('explain', () => {
  it('maps the rule rows to the counter behind them, and no other row', () => {
    expect(['accepted outputs', 'merged without edits ≥ 90 %', 'clean days', 'reverts', 'guardrail blocks', 'counted over the last 5 outputs', 'gated outputs', 'mechanical proof class', 'cooldown'].map(countKeyOf))
      .toEqual(['accepted', 'noEdit', 'cleanDays', 'reverts', 'guardrailBlocks', 'window', 'gated', null, null]);
  });

  it('accepted: the window\'s merges; a revert and an output outside the window are not counted, with why', () => {
    const x = explain('accepted', s);
    expect(x.counted.map((l) => l.iid)).toEqual([9, 7]);
    expect(x.excluded.map((l) => l.text)).toEqual(['reverted, not an accepted output · 2026-10-09', 'merged, outside the window (last 3)']);
    expect(x.note).toBeNull();
  });

  it('merged without edits splits the merges; gated lists the decided ones and names the one the gate did not decide', () => {
    expect(explain('noEdit', s)).toMatchObject({ counted: [{ iid: 9 }], excluded: [{ iid: 7, text: 'edited by another account before it merged · 2026-10-08' }] });
    expect(explain('gated', s)).toMatchObject({ counted: [{ iid: 9 }], missing: [{ iid: 7 }] });
  });

  it('reverts and clean days say the policy does not demote on a revert; clean days say where they start', () => {
    expect(explain('reverts', s).missing).toEqual([{ iid: null, text: 'trust-policy.yml does not demote on a revert, so reverts are not counted' }]);
    expect(explain('cleanDays', s).note).toBe('Counted since 2026-09-26, over the last 3 outputs.');
  });

  it('a capped list says so, and an MR links under the web URL only when there is one', () => {
    expect(explain('window', { ...s, total: 80 }).note).toContain('Lists the newest 4 of 80 outputs since 2026-09-26.');
    expect([mrHref(s, 9), mrHref({ ...s, web: 'https://gl.example/g/p' }, 9)]).toEqual([null, 'https://gl.example/g/p/-/merge_requests/9']);
  });
});
