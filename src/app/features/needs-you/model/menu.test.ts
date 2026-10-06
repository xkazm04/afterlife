import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../data/pick';
import { groupMenuPlan, rowMenuPlan, type MenuPlanItem } from './menu';
import { initialState } from './state';

const demo = pickNeedsYouDemo();
const labels = (plan: readonly MenuPlanItem[]) => plan.map((p) => ('sep' in p ? '-' : p.label));

describe('row menu', () => {
  it('a promotion offers inspect, its action, Not yet, Copy Command and Collapse', () => {
    expect(labels(rowMenuPlan(initialState(demo), 'n1', demo))).toEqual(['Show in Inspector', 'Promote', 'Not yet', '-', 'Copy Command', '-', 'Collapse “Extend trust”']);
  });
  it('a re-admission also offers Retire, which runs now', () => {
    expect(labels(rowMenuPlan(initialState(demo), 'n4', demo))).toContain('Retire (runs now)');
  });
  it('a gap offers Pick or Untick (Space) until it is staged', () => {
    const s = initialState(demo);
    expect(rowMenuPlan(s, 'g3', demo)).toContainEqual({ label: 'Pick', sc: 'Space', intent: { kind: 'act', action: 'tick:g3' } });
    expect(labels(rowMenuPlan(s, 'g1', demo))).toContain('Untick');
    expect(labels(rowMenuPlan({ ...s, gapStatus: { g1: 'staged' } }, 'g1', demo))).not.toContain('Untick');
  });
  it('the runner row has a read-only command to copy and no staged write', () => {
    const plan = rowMenuPlan(initialState(demo), 'n5', demo);
    expect(plan).toContainEqual({ label: 'Copy Command', intent: { kind: 'copy', text: 'npx belay doctor --only runner --json' } });
  });
  it('names the group of the current mode', () => {
    const s = { ...initialState(demo), group: 'project' as const };
    expect(labels(rowMenuPlan(s, 'n1', demo))).toContain('Collapse “acme-lab/belay-policy”');
  });
});

describe('group menu', () => {
  it('toggles between Collapse and Expand and always offers Expand All', () => {
    const s = initialState(demo);
    expect(labels(groupMenuPlan(s, 'clock'))).toEqual(['Collapse', 'Expand All']);
    expect(labels(groupMenuPlan(s, 'hist'))).toEqual(['Expand', 'Expand All']);
  });
});
