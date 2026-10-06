import { STAGES } from '@/schemas/stages';
import { upsertRows, type Queryable, type TableSpec } from '../sql';

const SPEC: TableSpec = {
  table: 'project_stage',
  key: ['project_id', 'stage'],
  cols: { project_id: 'text', stage: 'text', rung: 'smallint' },
};

/** Nine rungs 0..4 in STAGES order; null = unknown. */
export type StageRungs = readonly (number | null)[];

export async function setProjectStages(db: Queryable, perProject: ReadonlyMap<string, StageRungs>): Promise<void> {
  const rows: object[] = [];
  for (const [project_id, rungs] of perProject) {
    STAGES.forEach((stage, i) => rows.push({ project_id, stage, rung: rungs[i] ?? null }));
  }
  await upsertRows(db, SPEC, rows);
}

/** Every project's nine rungs, in STAGES order. A project with no rows is absent from the map. */
export async function listProjectStages(db: Queryable): Promise<Map<string, (number | null)[]>> {
  const { rows } = await db.query<{ project_id: string; stage: string; rung: number | null }>(
    'select project_id, stage, rung from project_stage',
  );
  const out = new Map<string, (number | null)[]>();
  for (const r of rows) {
    const slots = out.get(r.project_id) ?? STAGES.map(() => null as number | null);
    const i = STAGES.findIndex((s) => s === r.stage);
    if (i >= 0) slots[i] = r.rung;
    out.set(r.project_id, slots);
  }
  return out;
}
