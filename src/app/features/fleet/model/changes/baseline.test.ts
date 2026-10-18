import { describe, expect, it } from 'vitest';
import { makeProject } from '../testProject';
import { decodeBaseline, encodeBaseline, loadBaseline, saveBaseline, type BaselineStore } from './baseline';
import { changesFrom, digestFleet } from './diff';

const P = [makeProject({ id: 'fx-rates', needsYou: 2 }), makeProject({ id: 'docs-portal', proofs7d: null, classTiers: {} })];
const AT = 1_760_000_000_000;

const memory = (): BaselineStore & { v: string | null } => {
  const s = { v: null as string | null, read: () => s.v, write: (v: string) => void (s.v = v) };
  return s;
};
const broken: BaselineStore = {
  read: () => {
    throw new Error('SecurityError: storage is blocked');
  },
  write: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('baseline: the last look, per browser', () => {
  it('round-trips digests and time', () => {
    expect(decodeBaseline(encodeBaseline(P, AT))).toEqual({ at: AT, digests: digestFleet(P) });
    const store = memory();
    expect(saveBaseline(store, { at: AT, digests: digestFleet(P) })).toBe(true);
    expect(loadBaseline(store)).toEqual({ at: AT, digests: digestFleet(P) });
  });

  it('garbage, a wrong shape or a throwing store is no baseline, and no change', () => {
    expect(decodeBaseline('{garbage')).toBeNull();
    expect(decodeBaseline(null)).toBeNull();
    expect(decodeBaseline(JSON.stringify({ v: 1, at: 'yesterday', d: {} }))).toBeNull();
    expect(decodeBaseline(JSON.stringify({ v: 1, at: AT, d: { 'fx-rates': { needsYou: 'many' } } }))).toBeNull();
    expect(loadBaseline(broken)).toBeNull();
    expect(saveBaseline(broken, { at: AT, digests: {} })).toBe(false);
    const none = changesFrom(loadBaseline(broken), P);
    expect([none.count, none.ids.size, Object.keys(none.marks)]).toEqual([0, 0, []]);
  });
});
