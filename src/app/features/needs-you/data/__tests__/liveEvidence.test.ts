// Live: the view joins each promotion and re-admit to its class as the same snapshot holds it, by item id. A sign-off has
// no class to join, so it carries no evidence.
import { afterAll, describe, expect, it } from 'vitest';
import type { ActionClass, NeedsYouItem } from '@/lib/demo';
import { demoSource, setDataSource } from '@/server/data';
import { loadNeedsYouView } from '../pick';

afterAll(() => setDataSource(null));

const items: NeedsYouItem[] = [
  { id: 'promote:ledgerline:code-fix.patch', kind: 'promote', title: 'Promote T1 patcher · code-fix.patch', from: 'assisted', to: 'supervised', does: 'd' },
  { id: 'readmit:ledgerline:qa.file-bug', kind: 'readmit', title: 'Re-admit T7 qa · qa.file-bug', does: 'd' },
  { id: 'signoff:ledgerline:cra-1', kind: 'signoff', title: 'Sign off · CRA report', does: 'd' },
];
const cls = (id: string, tier: ActionClass['tier']): ActionClass => ({
  id, track: 'T1', ceiling: 'hands_off', tier, lease_days: null, lastMove: '1 d ago', record: { accepted: 5, needed: 5, noEdit: 5, cleanDays: 9, reverts: 0 },
});

describe('loadNeedsYouView, live: the class beside each write', () => {
  it('carries evidence for exactly the promotion and the re-admit', () => {
    setDataSource({
      ...demoSource, mode: 'live', getNeedsYou: () => items, deepProjectId: () => 'ledgerline',
      getActionClasses: () => [cls('code-fix.patch', 'assisted'), cls('qa.file-bug', 'quarantined')],
    });
    const view = loadNeedsYouView();
    expect(view.kind).toBe('live');
    if (view.kind !== 'live') return;
    expect(Object.keys(view.evidence).sort()).toEqual(['promote:ledgerline:code-fix.patch', 'readmit:ledgerline:qa.file-bug']);
    expect(view.evidence['promote:ledgerline:code-fix.patch']).toMatchObject({ kind: 'class', moved: null, canRun: true });
  });
});
