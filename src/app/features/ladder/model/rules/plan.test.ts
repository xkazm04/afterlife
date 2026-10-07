import { describe, expect, it } from 'vitest';
import type { ClassRow } from '../types';
import { commitText, planRows } from './plan';

const base: ClassRow = {
  id: 'dep-bump.patch',
  track: 'T1',
  ceiling: 'hands_off',
  tier: 'hands_off',
  lease_days: 9,
  record: { accepted: 16, needed: 15, noEdit: 0.94, cleanDays: 14, reverts: 0 },
  lastMove: 'promoted 5 d ago',
  pending: null,
};
const byId = { [base.id]: base, 'qa.file-bug': { ...base, id: 'qa.file-bug', tier: 'supervised' as const, lease_days: null } };

describe('planRows', () => {
  it('names each class with the tier it leaves and the one it goes to', () => {
    expect(planRows(byId, [{ id: 'dep-bump.patch', to: 'supervised' }, { id: 'qa.file-bug', to: 'assisted' }]).map((r) => [r.cls.id, r.from, r.to])).toEqual([
      ['dep-bump.patch', 'hands_off', 'supervised'],
      ['qa.file-bug', 'supervised', 'assisted'],
    ]);
  });
  it('ignores unknown ids', () => {
    expect(planRows(byId, [{ id: 'nope', to: 'assisted' }])).toEqual([]);
  });
});

describe('commitText', () => {
  const rows = planRows(byId, [{ id: 'dep-bump.patch', to: 'supervised' }]);
  it('words the ledger line with tier names and the commit', () => {
    expect(commitText('e7f1', rows)).toBe('commit e7f1 in belay-policy: dep-bump.patch Hands-off → Supervised');
  });
  it('says no commit id came back rather than inventing one', () => {
    expect(commitText(null, rows)).toBe('tier-state.yml written (no commit id read back) in belay-policy: dep-bump.patch Hands-off → Supervised');
  });
});
