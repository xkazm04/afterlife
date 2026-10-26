import { describe, expect, it } from 'vitest';
import { DEMO, DEMO_CYCLES } from '@/lib/demo';
import { buildCycles } from '../build';
import { candidates } from '../design';
import { openingCycle, openingDraft, toggleIn } from './opening';

const data = buildCycles(DEMO.maturity, DEMO_CYCLES.cycles, { project: 'acme-lab/ledgerline', today: DEMO_CYCLES.today, cadence: DEMO_CYCLES.cadence });
const planned = data.cycles.find((c) => c.state === 'planned')!;
const running = data.cycles.find((c) => c.state === 'running')!;

describe('where Cycles opens before a pick', () => {
  it('unread: nothing is selected and nothing is drafted', () => {
    expect(openingCycle(undefined, true)).toBeNull();
    expect(openingDraft(undefined, [], true)).toBeNull();
  });
  it('the running cycle, or the planned one with ?design=1', () => {
    expect(openingCycle(data, false)).toBe(running.id);
    expect(openingCycle(data, true)).toBe(planned.id);
  });
  it('the designer opens on every unblocked proposal, and only with ?design=1', () => {
    const all = candidates(data);
    expect(openingDraft(data, all, false)).toBeNull();
    expect(openingDraft(data, all, true)).toEqual(all.filter((c) => c.source === 'proposal' && !c.blocked).map((c) => c.id));
  });
  it('a toggle adds and removes; no draft stays none', () => {
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleIn(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleIn(null, 'a')).toBeNull();
  });
});
