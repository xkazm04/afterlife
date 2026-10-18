import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { makeProject } from '../testProject';
import { changeTitle, diffFleet, digestFleet, sinceLabel } from './diff';
import { seen } from './baseline';

const T = { hands_off: 2, supervised: 3, assisted: 1, quarantined: 0, human_only: 1 };
const fx = (over: Partial<FleetProject> = {}) => makeProject({ id: 'fx-rates', tiers: T, ...over });
const diff = (before: FleetProject[], after: FleetProject[]) => diffFleet(digestFleet(before), after);

describe('diffFleet: what moved per project', () => {
  it('a new quarantine and a class down from hands-off', () => {
    expect(diff([fx()], [fx({ tiers: { ...T, quarantined: 1 } })])['fx-rates']).toEqual([{ kind: 'quarantined', by: 1 }]);
    expect(diff([fx()], [fx({ tiers: { ...T, hands_off: 1, supervised: 4 } })])['fx-rates']).toEqual([{ kind: 'tier-down', from: 'hands_off', by: 1 }]);
  });

  it('decisions, failing proofs, going stale and recovering', () => {
    expect(diff([fx({ needsYou: 1 })], [fx({ needsYou: 3 })])['fx-rates']).toEqual([{ kind: 'needs', by: 2 }]);
    const proofs = (fail: number) => ({ pass: 3, fail, inconclusive: 0 });
    expect(diff([fx({ proofs7d: proofs(2) })], [fx({ proofs7d: proofs(5) })])['fx-rates']).toEqual([{ kind: 'fail', by: 3 }]);
    expect(diff([fx()], [fx({ state: 'stale' })])['fx-rates']).toEqual([{ kind: 'stale' }]);
    expect(diff([fx({ state: 'stale' })], [fx()])['fx-rates']).toEqual([{ kind: 'recovered' }]);
  });

  it('unknown never diffs as zero', () => {
    const unknown = fx({ classTiers: {}, tiers: { hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 } });
    expect(diff([unknown], [fx({ tiers: { ...T, quarantined: 2 } })])['fx-rates']).toEqual([{ kind: 'first-read' }]);
    expect(diff([fx({ proofs7d: null })], [fx({ proofs7d: { pass: 0, fail: 3, inconclusive: 0 } })])['fx-rates']).toBeUndefined();
    expect(diff([fx()], [unknown])['fx-rates']).toBeUndefined();
  });

  it('a new project, an unchanged one and a feed that only aged', () => {
    const other = makeProject({ id: 'docs-portal' });
    const out = diff([fx()], [fx({ feed: { ageSec: 900, ok: true } }), other]);
    expect(out).toEqual({ 'docs-portal': [{ kind: 'new' }] });
    expect(diff([fx(), other], [fx(), other])).toEqual({});
  });

  it('after Mark seen nothing has moved', () => {
    const after = [fx({ needsYou: 4, state: 'stale' }), makeProject({ id: 'docs-portal' })];
    expect(Object.keys(diff([fx()], after))).toHaveLength(2);
    expect(diffFleet(seen(after, 1_700_000_000_000).digests, after)).toEqual({});
  });

  it('the mark title names each change and the time of the last look', () => {
    const at = Date.UTC(2026, 9, 16, 12, 5);
    expect(changeTitle([{ kind: 'needs', by: 2 }, { kind: 'tier-down', from: 'hands_off', by: 1 }], at)).toBe(
      `needs you +2, 1 down from Hands-off since ${sinceLabel(at)}`,
    );
    expect(sinceLabel(at)).toMatch(/Oct/);
  });
});
