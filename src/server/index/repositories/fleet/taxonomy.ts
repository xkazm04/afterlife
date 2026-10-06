// The two small lookup lists the fleet grid is drawn from: groups (GitLab) and trust classes (trust-policy.yml).
import type { Ceiling } from '@/schemas/tier';
import { upsertRows, type Queryable, type TableSpec } from '../sql';

export interface TrustClassRow {
  id: string;
  /** Column order on the Fleet screen. */
  ord: number;
  track: number | null;
  agent: string | null;
  ceiling: Ceiling;
}

const GROUP: TableSpec = { table: 'fleet_group', key: ['path'], cols: { path: 'text', ord: 'int' } };
const CLASS: TableSpec = {
  table: 'trust_class',
  key: ['id'],
  cols: { id: 'text', ord: 'int', track: 'smallint', agent: 'text', ceiling: 'text' },
};

/** Group paths in display order. */
export const upsertGroups = (db: Queryable, paths: readonly string[]): Promise<void> =>
  upsertRows(db, GROUP, paths.map((path, ord) => ({ path, ord })));

export async function listGroups(db: Queryable): Promise<string[]> {
  const { rows } = await db.query<{ path: string }>('select path from fleet_group order by ord, path');
  return rows.map((r) => r.path);
}

export const upsertTrustClasses = (db: Queryable, rows: readonly TrustClassRow[]): Promise<void> => upsertRows(db, CLASS, rows);

export async function listTrustClasses(db: Queryable): Promise<TrustClassRow[]> {
  const { rows } = await db.query<TrustClassRow>('select id, ord, track, agent, ceiling from trust_class order by ord, id');
  return rows;
}
