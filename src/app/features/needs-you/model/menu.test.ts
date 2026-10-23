import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../data/pick';
import { copyCommand, groupMenuPlan, rowMenuPlan, type MenuPlanItem } from './menu';
import type { ActionPreview } from '@/server/actions/types';
import { initialState } from './state';

const demo = pickNeedsYouDemo();
const preview = { commands: [{ display: 'glab api --method POST projects/2/merge_requests' }], diff: [] } as unknown as ActionPreview;
const labels = (plan: readonly MenuPlanItem[]) => plan.map((p) => ('sep' in p ? '-' : p.label));

describe('row menu', () => {
  it('a promotion offers inspect, its action, Not yet and Collapse, and Copy Command once the server planned its write', () => {
    expect(labels(rowMenuPlan(initialState(demo), 'n1', demo))).toEqual(['Open', 'Promote', 'Not yet', '-', 'Collapse “Extend trust”']);
    const planned = { ...initialState(demo), writes: { n1: { kind: 'preview' as const, preview } } };
    expect(rowMenuPlan(planned, 'n1', demo)).toContainEqual({ label: 'Copy Command', intent: { kind: 'copy', text: 'glab api --method POST projects/2/merge_requests' } });
  });
  it('a re-admission also offers Retire, which writes nothing', () => {
    expect(labels(rowMenuPlan(initialState(demo), 'n4', demo))).toContain('Retire (no write)');
  });
  it('a gap offers Pick or Untick (Space) until it is staged', () => {
    const s = initialState(demo);
    expect(rowMenuPlan(s, 'g3', demo)).toContainEqual({ label: 'Pick', sc: 'Space', intent: { kind: 'act', action: 'tick:g3' } });
    expect(labels(rowMenuPlan(s, 'g1', demo))).toContain('Untick');
    expect(labels(rowMenuPlan({ ...s, gapStatus: { g1: 'staged' } }, 'g1', demo))).not.toContain('Untick');
  });
  it('a gap with no door (the probe, g4) is not offered Stage in the menu, but can still be picked', () => {
    const l = labels(rowMenuPlan(initialState(demo), 'g4', demo));
    expect(l).not.toContain('Stage');
    expect(l).toContain('Pick');
    expect(labels(rowMenuPlan(initialState(demo), 'g3', demo))).toContain('Stage');
  });
  it('the runner row has a read-only command to copy and no staged write', () => {
    const plan = rowMenuPlan(initialState(demo), 'n5', demo);
    expect(plan).toContainEqual({ label: 'Copy Command', intent: { kind: 'copy', text: 'npx belay doctor' } });
  });
  it('names the group of the current mode', () => {
    const s = { ...initialState(demo), group: 'project' as const };
    expect(labels(rowMenuPlan(s, 'n1', demo))).toContain('Collapse “acme-lab/belay-policy”');
  });
});

describe('copy command', () => {
  it('says Copied once the clipboard took it, and shows the command when it refused', async () => {
    const said: string[] = [];
    copyCommand('npx belay doctor', { writeText: () => Promise.resolve() }, (t) => said.push(t));
    copyCommand('npx belay doctor', { writeText: () => Promise.reject(new Error('denied')) }, (t) => said.push(t));
    await Promise.resolve();
    await Promise.resolve();
    expect(said).toEqual(['Copied command', 'npx belay doctor']);
  });
  it('shows the command instead of throwing where there is no Clipboard API (an insecure origin)', () => {
    const said: string[] = [];
    expect(() => copyCommand('npx belay doctor', undefined, (t) => said.push(t))).not.toThrow();
    expect(said).toEqual(['npx belay doctor']);
  });
});

describe('group menu', () => {
  it('toggles between Collapse and Expand and always offers Expand All', () => {
    const s = initialState(demo);
    expect(labels(groupMenuPlan(s, 'clock'))).toEqual(['Collapse', 'Expand All']);
    expect(labels(groupMenuPlan(s, 'hist'))).toEqual(['Expand', 'Expand All']);
  });
});
