import { describe, expect, it } from 'vitest';
import { TIER_ORDER, type Ceiling } from '@/schemas/tier';
import { cappedCell } from '@/server/index/seed/seedFleet';
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

// The ceilings the demo follows are its own: DEMO.actionClasses[].ceiling, which seedFleet writes to trust_class (they
// agree with policy/trust-policy.yml for every class both name).
describe('demo fleet tiers sit under their class ceilings', () => {
  const ceiling = (id: string): Ceiling => DEMO.actionClasses.find((a) => a.id === id)?.ceiling ?? 'human_only';
  const rank = (t: Ceiling): number => (t === 'human_only' ? -1 : TIER_ORDER.indexOf(t));
  it('shows no class tier above its ceiling: the gate would cap it', () => {
    const over = DEMO.fleet.projects.flatMap((p) =>
      Object.entries(p.classTiers).filter(([c, t]) => t !== null && t !== 'no_record' && t !== 'refused' && (ceiling(c) === 'human_only' ? t !== 'human_only' : rank(t) > rank(ceiling(c)))).map(([c, t]) => `${p.id} ${c} ${t}`),
    );
    expect(over).toEqual([]);
  });
  it('passes every cell through the gate rule unchanged, and counts each project from its cells', () => {
    for (const p of DEMO.fleet.projects) {
      for (const [c, t] of Object.entries(p.classTiers)) expect(cappedCell(t, ceiling(c), new Date())).toBe(t);
      const counts = Object.fromEntries(TIERS.map((k) => [k, Object.values(p.classTiers).filter((t) => t === k).length]));
      expect(p.tiers).toEqual(counts);
    }
  });
});
