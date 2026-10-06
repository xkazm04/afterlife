import { describe, expect, it } from 'vitest';
import type { ClassRow } from '../types';
import { buildPlan, commitText } from './plan';

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

describe('buildPlan', () => {
  it('writes the yq edit, the commit and the push', () => {
    const p = buildPlan(byId, [{ id: 'dep-bump.patch', to: 'supervised' }]);
    expect(p.msg).toBe('demote dep-bump.patch: hands_off -> supervised (manual revoke)');
    expect(p.cmd[0]).toBe('cd belay-policy && git pull --ff-only');
    expect(p.cmd[1]).toBe(`yq -i '.classes["dep-bump.patch"].tier = "supervised"' tier-state.yml`);
    expect(p.cmd[2]).toBe(`git commit -am "${p.msg}"`);
    expect(p.cmd[3]).toMatch(/^git push origin main/);
  });
  it('drops the lease in the diff only when there is one', () => {
    const leased = buildPlan(byId, [{ id: 'dep-bump.patch', to: 'assisted' }]).diff;
    expect(leased).toContain('-   lease_days: 9');
    const plain = buildPlan(byId, [{ id: 'qa.file-bug', to: 'assisted' }]).diff;
    expect(plain.some((l) => l.includes('lease_days'))).toBe(false);
    expect(plain).toContain('-   tier: supervised');
    expect(plain).toContain('+   tier: assisted');
  });
  it('ignores unknown ids', () => {
    expect(buildPlan(byId, [{ id: 'nope', to: 'assisted' }]).rows).toEqual([]);
  });
  it('words the ledger line with tier names', () => {
    const p = buildPlan(byId, [{ id: 'dep-bump.patch', to: 'supervised' }]);
    expect(commitText('e7f1', p.rows)).toBe('commit e7f1 in belay-policy: dep-bump.patch Hands-off → Supervised');
  });
});
