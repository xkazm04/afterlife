import { describe, expect, it } from 'vitest';
import { DEMO, getEstateCycles } from '@/lib/demo';
import { buildEstate, unwind } from './estate';
import type { Cycle, Rungs } from '../types';
import { STAGES } from '@/schemas/stages';

const estate = buildEstate('acme-lab', 'ledgerline', DEMO.fleet.groups, DEMO.fleet.projects, getEstateCycles());
const rows = estate.groups.flatMap((g) => g.projects);

describe('the estate in cycles (demo)', () => {
  it('six projects in five groups are in cycles; every other watching project is not yet', () => {
    expect(rows.map((r) => r.id).sort()).toEqual(['feature-store-worker', 'ledgerline', 'ledgerline-web', 'onboarding-cli', 'runner-pool-ui', 'statements-api']);
    expect(new Set(rows.map((r) => r.group)).size).toBe(5);
    expect(estate.inCycles + estate.notCycling).toBe(DEMO.fleet.projects.filter((p) => p.state === 'watching').length);
  });
  it('every history unwinds to a day 0 that replays exactly onto the project’s rungs today, chain intact', () => {
    for (const r of rows) expect([r.id, r.drift, r.breaks]).toEqual([r.id, [], 0]);
    expect(estate.reconciled).toBe(rows.length);
  });
  it('rolls up per group and for the estate: closed cycles, credited, missed, drift, net', () => {
    const cb = estate.groups.find((g) => g.group === 'core-banking')!;
    expect(cb.projects.map((p) => p.id)).toEqual(['ledgerline', 'ledgerline-web']);
    expect(cb.closed).toBe(9);
    expect(estate.closed).toBe(rows.reduce((n, r) => n + r.closed, 0));
    expect(estate.sum.net).toBe(rows.reduce((n, r) => n + r.sum.net, 0));
    expect(rows.find((r) => r.id === 'runner-pool-ui')?.sum).toMatchObject({ credited: 3, regressed: 1, net: 3 - 1 });
    expect(rows.find((r) => r.id === 'feature-store-worker')).toMatchObject({ closed: 1, sinceClose: 0 });
  });
  it('a history that does not add up says so', () => {
    const p = DEMO.fleet.projects.find((x) => x.id === 'statements-api')!;
    const bad: Cycle = { id: 'C1', n: 1, theme: '', state: 'closed', openedDay: 0, closedDay: 7, engine: 'v1', phase: 'credit',
      changes: [{ mr: '!1', kind: 'mr', stage: 'plan', from: 0, to: 3, title: '', verdict: 'credited', why: '' }] };
    const e = buildEstate('o', 'x', [p.group], [p], { [p.id]: { cycles: [bad], today: 7, cadence: 7 } });
    expect(e.groups[0]?.projects[0]?.drift).toEqual(['plan']);
    expect(e.reconciled).toBe(0);
  });
  it('unwinds newest first and leaves stages no change moved', () => {
    const now = Object.fromEntries(STAGES.map((s) => [s, 2])) as Rungs;
    const c = (n: number, from: number, to: number): Cycle => ({ id: `C${n}`, n, theme: '', state: 'closed', openedDay: 0, closedDay: 7, engine: 'v1', phase: 'credit',
      changes: [{ mr: '!1', kind: 'mr', stage: 'secure', from, to, title: '', verdict: 'credited', why: '' }] });
    expect(unwind(now, [c(1, 0, 1), c(2, 1, 2)])).toMatchObject({ secure: 0, verify: 2 });
  });
});
