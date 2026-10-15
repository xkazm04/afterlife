// The demo's own words agree with the promotion rule: a class whose lastMove says "eligible" is eligible by promotion()
// against the demo's policy (policy/trust-policy.yml), and no other class is. When they disagree, scripts/build-demo.mjs
// is fixed, never this test.
import { describe, expect, it } from 'vitest';
import { explain, isEligible, promotion } from '@/lib/promotion';
import { repoPolicy } from '@/server/data/policy';
import { DEMO_NOW } from './clock';
import { DEMO } from './index';

/** "record 16 / 15 · eligible" says it; "record 6 / 15 · not eligible" says it is not. */
const says = (lastMove: string): boolean => /\beligible\b/.test(lastMove) && !/\bnot eligible\b/.test(lastMove);
const proofOf = (track: string): string => DEMO.tracks.find((t) => t.id === track)?.proof.cls ?? '';

describe('the demo fixture and promotion() agree on who is eligible', () => {
  const rules = repoPolicy();
  it('reads the policy, and at least one class says eligible', () => {
    expect(rules).not.toBeNull();
    expect(DEMO.actionClasses.filter((c) => says(c.lastMove)).map((c) => c.id)).toEqual(['qa.file-bug']);
  });
  for (const c of DEMO.actionClasses) {
    it(`${c.id}: "${c.lastMove}"`, () => {
      expect(isEligible(promotion(c, proofOf(c.track), rules, DEMO_NOW))).toBe(says(c.lastMove));
    });
  }
});

// The outputs behind each count (sources) agree with the counters they explain, totalled the way Ladder lists them
// (explain()): every record has illustrative sources marked demo, and no class without a record has any.
describe('the demo fixture\'s sources agree with its counters', () => {
  const DAY = 86_400_000;
  for (const c of DEMO.actionClasses) {
    it(`${c.id}: ${c.record ? 'the listed outputs total its record' : 'no record, no sources'}`, () => {
      const r = c.record;
      const s = c.sources;
      if (!r) return expect(s ?? null).toBeNull();
      expect(s?.demo).toBe(true);
      if (!s) return;
      expect(s.total).toBe(s.outputs.length);
      expect(explain('accepted', s).counted).toHaveLength(r.accepted ?? -1);
      expect(explain('reverts', s).counted).toHaveLength(r.reverts ?? -1);
      expect(explain('gated', s).counted).toHaveLength(r.gated ?? -1);
      const merged = s.outputs.filter((o) => o.inWindow && o.outcome === 'merged');
      expect(Math.abs(explain('noEdit', s).counted.length / merged.length - (r.noEdit ?? -1))).toBeLessThan(0.005);
      if (r.reverts === 0) expect(Math.floor((DEMO_NOW.getTime() - Date.parse(s.since)) / DAY)).toBe(r.cleanDays);
      expect(explain('gated', s).missing.map((m) => m.iid)).toEqual(merged.filter((o) => !o.gated).map((o) => o.iid));
      expect(s.window ?? null).toBe(r.window ?? null);
      expect(s.excluded).toEqual(s.outputs.filter((o) => !o.inWindow).map((o) => ({ iid: o.iid, reason: 'outside_window' })));
      expect(s.outputs.every((o) => Date.parse(o.at) >= Date.parse(s.since) && Date.parse(o.at) <= DEMO_NOW.getTime())).toBe(true);
      // the next rung's trial: listed exactly when the record states it, its resolved lines total n and its catches
      expect(s.trial === undefined).toBe(r.trial === undefined);
      if (r.trial && s.trial) {
        const t = explain('trial', s);
        expect([t.counted.length, t.counted.filter((l) => /caught/.test(l.text)).length]).toEqual([r.trial.n, r.trial.catches]);
        expect(s.trial.every((x) => merged.some((o) => o.iid === x.iid && o.gated === true && Date.parse(x.at) < Date.parse(o.at)))).toBe(true);
      }
    });
  }

  it('no MR is an output of two classes', () => {
    const iids = DEMO.actionClasses.flatMap((c) => c.sources?.outputs.map((o) => o.iid) ?? []);
    expect(new Set(iids).size).toBe(iids.length);
  });
});
