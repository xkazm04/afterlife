import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { CADENCE_DAYS, CLOSED_CYCLES, TODAY } from '../data/history';
import { buildCycles } from './build';
import { applyDesign, candidates, checkDesign, designSummary, WIP_CAP } from './design';
import { chainBreaks } from './replay';

const data = buildCycles(DEMO.maturity, CLOSED_CYCLES, { project: 'acme-lab/ledgerline', today: TODAY, cadence: CADENCE_DAYS });
const all = candidates(data);
const byId = (id: string) => all.find((c) => c.id === id)!;

describe('candidates for the next cycle', () => {
  it('lists the planned proposals first, then one next rung per uncovered stage', () => {
    expect(all.map((c) => c.id)).toEqual(['g3', 'g4', 'next:plan', 'next:create', 'next:verify', 'next:package', 'next:secure', 'next:configure', 'next:govern']);
    expect(byId('next:verify')).toMatchObject({ from: 3, to: 4, kind: 'mr', title: 'Lift verify to R4 (self-proving)', blocked: null });
  });
  it('blocks the stages the running cycle is lifting', () => {
    expect(all.filter((c) => c.blocked).map((c) => c.id)).toEqual(['next:create', 'next:secure']);
    expect(byId('next:secure').blocked).toBe('C7 is lifting secure');
  });
});

describe('the rules of a design', () => {
  it('keeps a clean design clean', () => {
    expect(checkDesign([byId('g3'), byId('next:plan')])).toEqual([]);
  });
  it('refuses two changes on one stage, a moving stage, too many changes, and nothing at all', () => {
    const twice = { ...byId('g3'), id: 'x' };
    expect(checkDesign([byId('g3'), twice]).map((p) => p.rule)).toEqual(['one-per-stage']);
    expect(checkDesign([byId('next:secure')]).map((p) => p.rule)).toEqual(['moving']);
    const five = ['g3', 'g4', 'next:plan', 'next:verify', 'next:package'].map(byId);
    expect(five).toHaveLength(WIP_CAP + 1);
    expect(checkDesign(five).map((p) => p.rule)).toEqual(['wip']);
    expect(checkDesign([]).map((p) => p.rule)).toEqual(['empty']);
  });
  it('sums what a design costs and what it can earn (a probe on a known rung earns nothing)', () => {
    expect(designSummary([byId('g3'), byId('g4'), byId('next:plan')])).toEqual({ mrs: 2, probes: 1, lines: 51, drafted: 1, reach: 2 });
  });
});

describe('a saved design', () => {
  it('becomes the planned cycle, themed by its stages, without touching the history', () => {
    const next = applyDesign(data, [byId('next:verify'), byId('g3')]);
    const planned = next.cycles.at(-1)!;
    expect(planned).toMatchObject({ id: 'C8', state: 'planned', theme: 'Verify and Release' });
    expect(planned.changes.map((c) => [c.gap, c.verdict])).toEqual([['next:verify', 'planned'], ['g3', 'planned']]);
    expect(next.cycles.slice(0, -1)).toEqual(data.cycles.slice(0, -1));
    expect(chainBreaks(next.day0, next.cycles.filter((c) => c.state === 'closed'))).toEqual([]);
    expect(applyDesign(data, ['g3', 'g4', 'next:plan'].map(byId)).cycles.at(-1)!.theme).toBe('Release, Monitor and 1 more');
  });
});
