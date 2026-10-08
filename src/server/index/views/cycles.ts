// The Cycles screen's history: a project's closed cycles from cycle_record, counted in days since the first cycle opened
// (day 0, the onboarding scan). A project with no cycle file has an empty history, not a made-up one.
import type { Cycle, CycleHistory } from '@/lib/demo/cycleTypes';
import { listCycleRecords } from '../repositories/ledger/cycles';
import type { Queryable } from '../repositories/sql';

const DAY = 24 * 60 * 60 * 1000;
/** A cycle is a week: the weekly rescan closes it. */
export const CYCLE_DAYS = 7;

export async function getCycles(db: Queryable, projectId: string, at: Date): Promise<CycleHistory> {
  const { rows } = await db.query<{ gitlab_id: number | null }>('select gitlab_id from project where id = $1', [projectId]);
  const gid = rows[0]?.gitlab_id ?? null;
  const records = gid === null ? [] : await listCycleRecords(db, gid);
  const first = records[0];
  if (!first) return { cycles: [], today: 0, cadence: CYCLE_DAYS };
  const day0 = Date.parse(first.opened_at);
  const day = (iso: string): number => Math.round((Date.parse(iso) - day0) / DAY);
  const cycles: Cycle[] = records.map((r) => ({
    id: `C${r.seq}`, n: r.seq, theme: r.theme, state: 'closed', openedDay: day(r.opened_at), closedDay: day(r.closed_at),
    engine: r.engine, phase: 'credit',
    changes: r.changes.map((c) => ({
      mr: c.mr_iid === null ? null : `!${c.mr_iid}`, kind: c.kind, stage: c.stage, from: c.from, to: c.to, title: c.title,
      verdict: c.verdict, why: c.why, ...(c.lines === undefined ? {} : { lines: c.lines }),
    })),
  }));
  return { cycles, today: Math.max(0, Math.floor((at.getTime() - day0) / DAY)), cadence: CYCLE_DAYS };
}
