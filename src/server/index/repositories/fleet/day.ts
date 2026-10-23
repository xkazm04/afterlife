// fleet_day: one row per project per UTC day (migration 0019), append-only. A day is written once, after its first poll
// cycle, and never rewritten: the write does nothing when the day already has a row, and the table refuses update and
// delete. Read back as the trend's rows (src/lib/trend).
import type { FleetDayRow } from '@/lib/trend/trend';
import { registerSpec, type Queryable, type TableSpec } from '../sql';

const SPEC: TableSpec = {
  table: 'fleet_day',
  key: ['day', 'project_id'],
  cols: {
    day: 'date', project_id: 'text', group_path: 'text', needs: 'int', stale: 'boolean', hands_off: 'int',
    proofs_7d: 'int', red_rate: 'real', cost_usd: 'real',
  },
};
registerSpec(SPEC);

interface Db {
  day: string; project_id: string; group_path: string | null; needs: number; stale: boolean; hands_off: number | null;
  proofs_7d: number | null; red_rate: number | null; cost_usd: number | null;
}

const toDb = (day: string, r: FleetDayRow): Db => ({
  day, project_id: r.projectId, group_path: r.groupPath, needs: r.needs, stale: r.stale, hands_off: r.handsOff,
  proofs_7d: r.proofs7d, red_rate: r.redRate, cost_usd: r.costUsd,
});

const names = Object.keys(SPEC.cols);
const defs = names.map((c) => `${c} ${SPEC.cols[c]}`).join(', ');

/**
 * Writes `day`'s rows (YYYY-MM-DD, UTC; each row's own day is ignored) unless the day already has one: a second write the
 * same day writes nothing. Returns how many rows were written.
 */
export async function writeFleetDay(db: Queryable, day: string, rows: readonly FleetDayRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { rows: wrote } = await db.query<{ day: string }>(
    `insert into fleet_day (${names.join(', ')}) select ${names.join(', ')} from jsonb_to_recordset($1::jsonb) as x(${defs}) ` +
      `where not exists (select 1 from fleet_day where day = $2::date) on conflict (day, project_id) do nothing returning day`,
    [JSON.stringify(rows.map((r) => toDb(day, r))), day],
  );
  return wrote.length;
}

/** Every row from `sinceDay` (inclusive) on, oldest day first, then by project. */
export async function readFleetDays(db: Queryable, sinceDay: string): Promise<FleetDayRow[]> {
  const { rows } = await db.query<Db>(
    `select to_char(day, 'YYYY-MM-DD') as day, project_id, group_path, needs, stale, hands_off, proofs_7d, red_rate, cost_usd
     from fleet_day where day >= $1::date order by day, project_id`,
    [sinceDay],
  );
  return rows.map((r) => ({
    day: r.day, projectId: r.project_id, groupPath: r.group_path, needs: r.needs, stale: r.stale, handsOff: r.hands_off,
    proofs7d: r.proofs_7d, redRate: r.red_rate, costUsd: r.cost_usd,
  }));
}
