import type { ClassRecord } from '@/lib/demo/types';
import type { Ceiling } from '@/schemas/tier';
import { asDate, toIso, upsertRows, type Queryable, type TableSpec } from '../sql';

/**
 * How the class last changed. 'note' carries a fixed explanation in `note`. 'no_record' and 'refused' are standings, read
 * by views/standing.ts: no agent holds the class (the row's tier is quarantined: the gate blocks it), or several agents
 * hold it (the row's tier is the most restrictive holder's; `note` lists each holder at its own tier, as CI gates it).
 */
export type MoveKind = 'promoted' | 'demoted' | 'tripwire' | 'ineligible' | 'note' | 'no_record' | 'refused';

export interface ClassTierRow {
  projectId: string;
  classId: string;
  /** null: unknown. */
  tier: Ceiling | null;
  since: Date | null;
  setBy: string | null;
  leaseExpires: Date | null;
  /** The ledger-derived record; null when the project is not watched that deeply. */
  record: ClassRecord | null;
  move: { kind: MoveKind; at: Date | null; note: string | null } | null;
}

const SPEC: TableSpec = {
  table: 'class_tier',
  key: ['project_id', 'class_id'],
  cols: {
    project_id: 'text', class_id: 'text', tier: 'text', since: 'timestamptz', set_by: 'text', lease_expires: 'timestamptz',
    accepted: 'int', needed: 'int', no_edit: 'float8', clean_days: 'int', reverts: 'int',
    move_kind: 'text', move_at: 'timestamptz', move_note: 'text',
  },
};

interface Db {
  project_id: string; class_id: string; tier: Ceiling | null; since: Date | null; set_by: string | null;
  lease_expires: Date | null; accepted: number | null; needed: number | null; no_edit: number | null;
  clean_days: number | null; reverts: number | null; move_kind: MoveKind | null; move_at: Date | null; move_note: string | null;
}

const toDb = (r: ClassTierRow): Record<string, unknown> => ({
  project_id: r.projectId, class_id: r.classId, tier: r.tier, since: toIso(r.since), set_by: r.setBy,
  lease_expires: toIso(r.leaseExpires),
  accepted: r.record?.accepted ?? null, needed: r.record?.needed ?? null, no_edit: r.record?.noEdit ?? null,
  clean_days: r.record?.cleanDays ?? null, reverts: r.record?.reverts ?? null,
  move_kind: r.move?.kind ?? null, move_at: toIso(r.move?.at), move_note: r.move?.note ?? null,
});

const fromDb = (r: Db): ClassTierRow => ({
  projectId: r.project_id, classId: r.class_id, tier: r.tier, since: asDate(r.since), setBy: r.set_by,
  leaseExpires: asDate(r.lease_expires),
  record:
    r.accepted === null || r.no_edit === null || r.clean_days === null || r.reverts === null
      ? null
      : { accepted: r.accepted, needed: r.needed, noEdit: r.no_edit, cleanDays: r.clean_days, reverts: r.reverts },
  move: r.move_kind ? { kind: r.move_kind, at: asDate(r.move_at), note: r.move_note } : null,
});

/** Trust classes must exist first (see upsertTrustClasses). */
export const upsertClassTiers = (db: Queryable, rows: readonly ClassTierRow[]): Promise<void> => upsertRows(db, SPEC, rows.map(toDb));

/** One project's rows, or every project's when `projectId` is omitted. */
export async function listClassTiers(db: Queryable, projectId?: string): Promise<ClassTierRow[]> {
  const { rows } =
    projectId === undefined
      ? await db.query<Db>('select * from class_tier order by project_id, class_id')
      : await db.query<Db>('select * from class_tier where project_id = $1 order by class_id', [projectId]);
  return rows.map(fromDb);
}
