import { describe, expect, it } from 'vitest';
import { DEMO, getEstateCycles } from '@/lib/demo';
import { buildEstate } from './estate';
import { estateCycles, estateSummary, isEstateSummary } from './split';

const estate = buildEstate('acme-lab', 'ledgerline', DEMO.fleet.groups, DEMO.fleet.projects, getEstateCycles());

describe('the estate split for the stream', () => {
  it('the rows keep every number and lose only their cycles', () => {
    const s = estateSummary(estate);
    const rows = s.groups.flatMap((g) => g.projects);
    expect(rows.length).toBe(estate.inCycles);
    expect(rows.every((r) => !('cycles' in r))).toBe(true);
    expect(s.reconciled).toBe(estate.reconciled);
    expect(JSON.stringify(s).length).toBeLessThan(JSON.stringify(estate).length);
  });
  it('the cycles come back by project id, each history whole', () => {
    const c = estateCycles(estate);
    for (const p of estate.groups.flatMap((g) => g.projects)) expect(c[p.id]).toEqual(p.cycles);
  });
  it('only an estate answer counts as one (the project scope sends an empty object)', () => {
    expect(isEstateSummary(estateSummary(estate))).toBe(true);
    expect(isEstateSummary({})).toBe(false);
    expect(isEstateSummary(null)).toBe(false);
  });
});
