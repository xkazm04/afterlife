// cycle_record: the estate read (listAllCycleRecords) groups every project's chain by index id, oldest first, the same
// chain listCycleRecords reads for one project.
import { describe, expect, it, vi } from 'vitest';
import { appendCycle, type CycleRecord } from '@/schemas/cycle';
import { listAllCycleRecords, listCycleRecords, replaceCycleRecords } from '../../repositories';
import { memoryIndex } from '../memoryIndex';

vi.mock('server-only', () => ({}));

function chainOf(gitlabId: number, n: number): CycleRecord[] {
  const chain: CycleRecord[] = [];
  for (let i = 0; i < n; i += 1) {
    const opened = new Date(Date.UTC(2026, 0, 1 + i * 7)).toISOString();
    const closed = new Date(Date.UTC(2026, 0, 8 + i * 7)).toISOString();
    chain.push(appendCycle(chain, { project_id: gitlabId, theme: `t${i}`, engine: 'e1', opened_at: opened, closed_at: closed, changes: [] }));
  }
  return chain;
}

describe('cycle_record reads', () => {
  it('reads every project chain whole and in seq order, as the per-project read does', async () => {
    const db = await memoryIndex();
    await replaceCycleRecords(db, 'b', chainOf(2, 3));
    await replaceCycleRecords(db, 'a', chainOf(1, 4));

    const all = await listAllCycleRecords(db);
    expect([...all.keys()]).toEqual(['a', 'b']);
    expect(all.get('a')?.map((r) => r.seq)).toEqual([1, 2, 3, 4]);
    expect(all.get('b')?.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(all.get('a')).toEqual(await listCycleRecords(db, 'a'));
    expect(all.get('b')).toEqual(chainOf(2, 3));
  });

  it('reads an empty map when no project has a cycle', async () => {
    expect((await listAllCycleRecords(await memoryIndex())).size).toBe(0);
  });
});
