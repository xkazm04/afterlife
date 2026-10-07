import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { STAGES } from '@/schemas/stages';
import { CREDIT_HISTORY } from '../../maturity/data/credit';
import { CADENCE_DAYS, CLOSED_CYCLES, TODAY } from '../data/history';
import { buildCycles } from './build';
import { carried, rail } from './plan';
import { gridView } from './grid';
import { applyCycle, chainBreaks, heatGrid, MAX_TOTAL, reach, reconcile, replay, summarize, total } from './replay';
import type { Cycle, Rungs } from './types';

const data = buildCycles(DEMO.maturity, CLOSED_CYCLES, { project: 'acme-lab/ledgerline', today: TODAY, cadence: CADENCE_DAYS });
const zero = Object.fromEntries(STAGES.map((s) => [s, 0])) as Rungs;
const cycle = (over: Partial<Cycle>): Cycle => ({
  id: 'C1', n: 1, theme: '', state: 'closed', openedDay: 0, closedDay: 7, engine: 'v1', phase: 'credit', changes: [], ...over,
});

describe('the demo history', () => {
  it('replays from day 0 to exactly the 14:02 scan', () => {
    expect(data.drift).toEqual([]);
    expect(total(replay(data.day0, CLOSED_CYCLES).at(-1)!)).toBe(total(data.scanned));
  });
  it('holds the chain: every change starts where the last one left its stage', () => {
    expect(data.breaks).toEqual([]);
  });
  it('carries every Maturity credit-history entry as a change with the same verdict', () => {
    const changes = CLOSED_CYCLES.flatMap((c) => c.changes);
    for (const e of CREDIT_HISTORY) {
      const hit = changes.find((c) => c.mr === e.mr && c.stage === e.stage);
      expect(hit, `${e.mr} ${e.stage}`).toBeDefined();
      expect(hit!.verdict).toBe(e.verdict);
    }
  });
  it('is one engine, numbered in order, a week a cycle', () => {
    data.cycles.forEach((c, i) => {
      expect(c.n).toBe(i + 1);
      expect(c.engine).toBe(data.engine);
    });
    for (const c of CLOSED_CYCLES) expect(c.closedDay! - c.openedDay).toBe(CADENCE_DAYS);
  });
  it('opens with the picked gaps running and the rest planned', () => {
    const [running, planned] = data.cycles.slice(-2) as [Cycle, Cycle];
    expect(running).toMatchObject({ id: 'C7', state: 'running', phase: 'send' });
    expect(running.changes.map((c) => c.gap)).toEqual(['g1', 'g2']);
    expect(planned.changes.map((c) => c.gap)).toEqual(['g3', 'g4']);
  });
  it('says the planned monitor probe retries the change C5 could not earn', () => {
    const g4 = data.cycles.at(-1)!.changes.find((c) => c.gap === 'g4')!;
    expect(g4.kind).toBe('probe');
    expect(g4.why).toMatch(/^retries !21 from C5/);
  });
});

describe('replay', () => {
  it('moves rungs only on credited, resolved and regressed', () => {
    const c = cycle({
      changes: [
        { mr: '!1', kind: 'mr', stage: 'plan', from: 0, to: 2, title: '', verdict: 'credited', why: '' },
        { mr: '!2', kind: 'mr', stage: 'create', from: 0, to: 1, title: '', verdict: 'rejected', why: '' },
        { mr: '!3', kind: 'mr', stage: 'verify', from: 0, to: 1, title: '', verdict: 'nolift', why: '' },
        { mr: null, kind: 'probe', stage: 'monitor', from: null, to: 1, title: '', verdict: 'resolved', why: '' },
      ],
    });
    const after = applyCycle({ ...zero, monitor: null }, c);
    expect([after.plan, after.create, after.verify, after.monitor]).toEqual([2, 0, 0, 1]);
    expect(summarize(c)).toEqual({ sent: 3, credited: 1, missed: 2, regressed: 0, resolved: 1, net: 3 });
  });
  it('moves nothing for a running cycle', () => {
    const c = cycle({ state: 'running', changes: [{ mr: null, kind: 'mr', stage: 'plan', from: 0, to: 1, title: '', verdict: 'pending', why: '' }] });
    expect(applyCycle(zero, c)).toBe(zero);
  });
  it('counts a regression against the net and draws it down in the grid', () => {
    const c = cycle({ changes: [{ mr: null, kind: 'drift', stage: 'verify', from: 3, to: 2, title: '', verdict: 'regressed', why: '' }] });
    expect(summarize(c).net).toBe(-1);
    expect(heatGrid({ ...zero, verify: 3 }, [c]).verify[1]).toEqual({ rung: 2, move: 'down', tried: false });
  });
  it('finds a break when a change claims a rung the replay does not hold', () => {
    const c = cycle({ changes: [{ mr: '!9', kind: 'mr', stage: 'plan', from: 1, to: 2, title: '', verdict: 'credited', why: '' }] });
    expect(chainBreaks(zero, [c])).toEqual([{ cycle: 'C1', stage: 'plan', text: '!9 starts at R1; replay holds R0' }]);
  });
  it('reconciles stage by stage and never treats unknown as zero', () => {
    expect(reconcile({ ...zero, monitor: null }, zero)).toEqual(['monitor']);
    expect(total({ ...zero, monitor: null, plan: 4 })).toBe(4);
    expect(MAX_TOTAL).toBe(36);
  });
  it('marks a found rung and a tried-but-missed stage in the grid', () => {
    const grid = heatGrid(data.day0, CLOSED_CYCLES);
    expect(grid.monitor[1]?.move).toBe('found');
    expect(grid.plan[2]).toMatchObject({ move: 'same', tried: true });
    expect(grid.plan[3]?.move).toBe('up');
  });
});

describe('plan', () => {
  it('stops carrying a missed change once the stage reaches its rung', () => {
    expect(carried(CLOSED_CYCLES, data.scanned).map((c) => c.mr)).toEqual(['!21']);
  });
  it('carries one change per stage and target (the newest try), rebased to where the stage stands now', () => {
    const miss = (mr: string, from: number) => ({ mr, kind: 'mr' as const, stage: 'plan' as const, from, to: 2, title: '', verdict: 'nolift' as const, why: '' });
    const out = carried([cycle({ id: 'C1', changes: [miss('!1', 0)] }), cycle({ id: 'C2', changes: [miss('!2', 0)] })], { ...zero, plan: 1 });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ mr: '!2', from: 1, from_cycle: 'C2' });
  });
  it('counts a probe on a known rung as nothing in reach, and on an unknown as the rung it finds', () => {
    const probe = (from: number | null) => ({ mr: null, kind: 'probe' as const, stage: 'monitor' as const, from, to: 2, title: '', verdict: 'planned' as const, why: '' });
    expect([reach(probe(1)), reach(probe(null))]).toEqual([0, 2]);
    expect(gridView(data.day0, data.cycles).columns.map((c) => c.projected).slice(-2)).toEqual([21, 22]);
  });
  it('walks the rail: closed all done, running up to its phase, planned all to do', () => {
    const [closed, running, planned] = [data.cycles[0]!, data.cycles.at(-2)!, data.cycles.at(-1)!];
    expect(rail(closed).every((s) => s.state === 'done')).toBe(true);
    expect(rail(running).map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo']);
    expect(rail(planned).every((s) => s.state === 'todo')).toBe(true);
  });
});
