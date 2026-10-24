import { afterEach, describe, expect, it } from 'vitest';
import type { RunnerDesk } from '@/lib/runs/desk/types';
import { demoSource, setDataSource } from '@/server/data';
import { loadMonitorData } from './loadMonitorData';
import { loadMonitorEstate } from './loadMonitorEstate';

afterEach(() => setDataSource(null));

const desk = (rows: { slug: string; costUsd?: number }[]) => ({ rows }) as unknown as RunnerDesk;

describe('loadMonitorEstate (demo)', () => {
  it('no runner desk: cost not read (null, never $0); stability and the seeded trend still read', () => {
    setDataSource(demoSource);
    const e = loadMonitorEstate(loadMonitorData(), null);
    expect(e.cost).toBeNull();
    expect(e.stability).not.toBeNull();
    expect(e.trend?.seeded).toBe(true);
    expect(e.trend?.rows.length).toBeGreaterThan(0);
  });
  it("sums the spend over the fleet's own metered projects only; a run of a repo outside the fleet adds nothing", () => {
    setDataSource(demoSource);
    const data = loadMonitorData();
    const [a, b] = data.projects;
    const e = loadMonitorEstate(data, desk([{ slug: a!.id, costUsd: 1.25 }, { slug: b!.id }, { slug: 'not-in-the-fleet', costUsd: 99 }]));
    expect(e.cost).toEqual({ costUsd: 1.25, metered: 1, of: data.projects.length });
  });
  it('runs with no cost recorded: the sum is null (no line), not 0', () => {
    setDataSource(demoSource);
    const data = loadMonitorData();
    expect(loadMonitorEstate(data, desk([{ slug: data.projects[0]!.id }])).cost?.costUsd).toBeNull();
  });
});
