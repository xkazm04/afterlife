// cycle_record: a project's closed cycles, a cache of belay-ledger/cycles/<gitlab-id>.jsonl. The file is replaced
// whole on import (it is short: one line a week), after the import has checked it extends what is stored.
import type { CycleChangeRecord, CycleRecord } from '@/schemas/cycle';
import { asDate, type Queryable } from '../sql';

interface Db {
  project_id: string; seq: number; gitlab_project_id: number; theme: string; engine: string; opened_at: Date | string;
  closed_at: Date | string; changes: CycleChangeRecord[]; prev_hash: string; hash: string;
}

const iso = (v: Date | string): string => (asDate(v) as Date).toISOString();
const toRecord = (r: Db): CycleRecord => ({
  seq: r.seq, project_id: r.gitlab_project_id, theme: r.theme, engine: r.engine, opened_at: iso(r.opened_at),
  closed_at: iso(r.closed_at), changes: r.changes, prev_hash: r.prev_hash, hash: r.hash,
});

/** The stored chain of one project (index id), oldest first. */
export async function listCycleRecords(db: Queryable, projectId: string): Promise<CycleRecord[]> {
  const { rows } = await db.query<Db>('select * from cycle_record where project_id = $1 order by seq', [projectId]);
  return rows.map(toRecord);
}

/** Every project's stored chain, by index id, oldest first. */
export async function listAllCycleRecords(db: Queryable): Promise<Map<string, CycleRecord[]>> {
  const { rows } = await db.query<Db>('select * from cycle_record order by project_id, seq');
  const out = new Map<string, CycleRecord[]>();
  for (const r of rows) {
    const chain = out.get(r.project_id);
    if (chain) chain.push(toRecord(r)); // appended in place: a copy per row made the read quadratic in a project's chain
    else out.set(r.project_id, [toRecord(r)]);
  }
  return out;
}

/** Replaces the project's stored chain with `records` (already verified by the caller). */
export async function replaceCycleRecords(db: Queryable, projectId: string, records: readonly CycleRecord[]): Promise<void> {
  await db.query('delete from cycle_record where project_id = $1', [projectId]);
  if (records.length === 0) return;
  // One statement for the whole chain (the rows travel as one jsonb document), not one round trip per cycle.
  await db.query(
    `insert into cycle_record (project_id, seq, gitlab_project_id, theme, engine, opened_at, closed_at, changes, prev_hash, hash)
     select $1, seq, project_id, theme, engine, opened_at, closed_at, changes, prev_hash, hash
     from jsonb_to_recordset($2::jsonb) as x(seq int, project_id int, theme text, engine text, opened_at timestamptz,
       closed_at timestamptz, changes jsonb, prev_hash text, hash text)`,
    [projectId, JSON.stringify(records)],
  );
}
