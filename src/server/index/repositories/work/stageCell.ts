import type { Stage } from '@/schemas/stages';
import { asDate, toIso, upsertRows, type Queryable, type TableSpec } from '../sql';

export interface StageCellRow {
  projectId: string;
  stage: Stage;
  /** Index into RUNGS (0 absent .. 4 self-proving); null = unknown, never absent. */
  rung: number | null;
  /** The rung on day 0; null = unknown. */
  baseRung: number | null;
  nextRung: number | null;
  /** GitLab objects that justify the rung. */
  evidence: { label: string; url: string }[];
  /** One-line summary of the evidence, as the scan wrote it. */
  evidenceNote: string | null;
  engineVersion: string | null;
  scannedAt: Date;
}

const SPEC: TableSpec = {
  table: 'stage_cell',
  key: ['project_id', 'stage', 'scanned_at'],
  cols: {
    project_id: 'text', stage: 'text', rung: 'smallint', base_rung: 'smallint', next_rung: 'smallint', evidence: 'jsonb',
    evidence_note: 'text', engine_version: 'text', scanned_at: 'timestamptz',
  },
};

interface Db {
  project_id: string; stage: Stage; rung: number | null; base_rung: number | null; next_rung: number | null;
  evidence: { label: string; url: string }[]; evidence_note: string | null; engine_version: string | null; scanned_at: Date;
}

export const upsertStageCells = (db: Queryable, rows: readonly StageCellRow[]): Promise<void> =>
  upsertRows(db, SPEC, rows.map((c) => ({
    project_id: c.projectId, stage: c.stage, rung: c.rung, base_rung: c.baseRung, next_rung: c.nextRung,
    evidence: c.evidence, evidence_note: c.evidenceNote, engine_version: c.engineVersion, scanned_at: toIso(c.scannedAt),
  })));

/** The cells of the project's most recent scan. */
export async function latestStageCells(db: Queryable, projectId: string): Promise<StageCellRow[]> {
  const { rows } = await db.query<Db>(
    `select * from stage_cell where project_id = $1
       and scanned_at = (select max(scanned_at) from stage_cell where project_id = $1)`,
    [projectId],
  );
  return rows.map((r) => ({
    projectId: r.project_id, stage: r.stage, rung: r.rung, baseRung: r.base_rung, nextRung: r.next_rung,
    evidence: r.evidence, evidenceNote: r.evidence_note, engineVersion: r.engine_version, scannedAt: asDate(r.scanned_at) as Date,
  }));
}
