// cycle_record: a project's closed cycles, a cache of belay-ledger/cycles/<project-id>.jsonl. The file is replaced
// whole on import (it is short: one line a week), after the import has checked it extends what is stored.
import type { CycleChangeRecord, CycleRecord } from '@/schemas/cycle';
import { asDate, type Queryable } from '../sql';

interface Db {
  project_id: number; seq: number; theme: string; engine: string; opened_at: Date | string; closed_at: Date | string;
  changes: CycleChangeRecord[]; prev_hash: string; hash: string;
}

/** The stored chain of one GitLab project, oldest first. */
export async function listCycleRecords(db: Queryable, gitlabProjectId: number): Promise<CycleRecord[]> {
  const { rows } = await db.query<Db>('select * from cycle_record where project_id = $1 order by seq', [gitlabProjectId]);
  return rows.map((r) => ({
    seq: r.seq, project_id: r.project_id, theme: r.theme, engine: r.engine,
    opened_at: (asDate(r.opened_at) as Date).toISOString(), closed_at: (asDate(r.closed_at) as Date).toISOString(),
    changes: r.changes, prev_hash: r.prev_hash, hash: r.hash,
  }));
}

/** Replaces the project's stored chain with `records` (already verified by the caller). */
export async function replaceCycleRecords(db: Queryable, gitlabProjectId: number, records: readonly CycleRecord[]): Promise<void> {
  await db.query('delete from cycle_record where project_id = $1', [gitlabProjectId]);
  for (const r of records) {
    await db.query(
      `insert into cycle_record (project_id, seq, theme, engine, opened_at, closed_at, changes, prev_hash, hash)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [gitlabProjectId, r.seq, r.theme, r.engine, r.opened_at, r.closed_at, JSON.stringify(r.changes), r.prev_hash, r.hash],
    );
  }
}
