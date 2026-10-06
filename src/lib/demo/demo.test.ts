import { describe, expect, it } from 'vitest';
import { DEMO, LEDGERLINE_ID, getNeedsYouCount, getProject, getTask } from './index';

const TIERS = ['hands_off', 'supervised', 'assisted', 'quarantined', 'human_only'];
const STATES = ['watching', 'setting-up', 'stale', 'not-set-up'];

describe('demo fixture matches its types', () => {
  it('has the fleet at production scale', () => {
    expect(DEMO.fleet.projects).toHaveLength(184);
    expect(DEMO.fleet.groups).toHaveLength(7);
    expect(DEMO.fleet.classes).toHaveLength(12);
    expect(DEMO.stages).toHaveLength(9);
  });
  it('uses only known states, tier keys and nine stage slots', () => {
    for (const p of DEMO.fleet.projects) {
      expect(STATES).toContain(p.state);
      expect(Object.keys(p.tiers).sort()).toEqual([...TIERS].sort());
      expect(p.stages).toHaveLength(9);
      expect(DEMO.fleet.groups).toContain(p.group);
      for (const t of Object.values(p.classTiers)) expect(t === null || TIERS.includes(t)).toBe(true);
    }
  });
  it('knows the deep project', () => {
    expect(getProject(LEDGERLINE_ID)?.needsYou).toBe(5);
    expect(getNeedsYouCount()).toBe(5);
    expect(getTask('01J8Q4')?.mr).toBe('!41');
    expect(getTask('nope')).toBeUndefined();
  });
  it('uses valid tier keys in the deep data', () => {
    for (const c of DEMO.actionClasses) {
      expect(TIERS).toContain(c.tier);
      expect(TIERS).toContain(c.ceiling);
    }
    for (const t of DEMO.tasks) expect(TIERS).toContain(t.tierAtTime);
    for (const k of TIERS) expect(DEMO.tiers[k as keyof typeof DEMO.tiers].label).toBeTruthy();
  });
});
