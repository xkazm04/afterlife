import { describe, expect, it, vi } from 'vitest';
import { memoryIndex } from '../memoryIndex';

vi.mock('server-only', () => ({}));

const STAGES = "('plan'),('create'),('verify'),('package'),('secure'),('release'),('configure'),('monitor'),('govern')";

interface PlanNode { 'Node Type': string; 'Actual Rows': number; 'Actual Loops': number; Plans?: PlanNode[] }

/** Rows every node of the plan handed up (rows x loops, summed): what the query touched to answer. */
const touched = (n: PlanNode): number => n['Actual Rows'] * n['Actual Loops'] + (n.Plans ?? []).reduce((s, c) => s + touched(c), 0);

/** A store holding `scans` scans of 9 stages for each of three projects; returns rows touched by latest-scan reads of p1. */
async function rowsTouched(scans: number): Promise<{ latestScanAt: number; latestCells: number }> {
  const db = await memoryIndex();
  await db.exec(`insert into fleet_group (path, ord) values ('g', 0)`);
  for (const p of ['p1', 'p2', 'p3']) {
    await db.exec(`insert into project (id, name, group_path, state) values ('${p}', 'p', 'g', 'watching')`);
    await db.exec(
      `insert into stage_cell (project_id, stage, scanned_at)
         select '${p}', s, timestamptz '2026-01-01' + g * interval '1 hour'
           from generate_series(0, ${scans - 1}) g, (values ${STAGES}) v(s)`,
    );
  }
  await db.exec('analyze stage_cell');
  const plan = async (sql: string): Promise<number> => {
    const { rows } = await db.query<{ 'QUERY PLAN': { Plan: PlanNode }[] }>(`explain (analyze, format json, costs off, timing off) ${sql}`);
    return touched(rows[0]!['QUERY PLAN'][0]!.Plan);
  };
  return {
    // the two statements of repositories/work/stageCell.ts
    latestScanAt: await plan(`select max(scanned_at) as at from stage_cell where project_id = 'p1'`),
    latestCells: await plan(
      `select * from stage_cell where project_id = 'p1' and scanned_at = (select max(scanned_at) from stage_cell where project_id = 'p1')`,
    ),
  };
}

describe('stage_cell latest-scan reads', () => {
  it('touch a constant number of rows however long the scan history grows', async () => {
    const small = await rowsTouched(100);
    const large = await rowsTouched(1000);
    // 9 cells of the newest scan, plus the one index entry max(scanned_at) reads (3 nodes): independent of the 9 x scans stored.
    expect(large.latestScanAt).toBeLessThanOrEqual(3);
    expect(large.latestCells).toBeLessThanOrEqual(12);
    expect(large.latestCells).toBe(small.latestCells);
  }, 60_000);
});
