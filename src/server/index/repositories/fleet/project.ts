import type { ProjectState, ProofCounts } from '@/lib/demo/types';
import { asDate, toIso, upsertRows, type Queryable, type TableSpec } from '../sql';

export interface ProjectRow {
  id: string;
  gitlabId: number | null;
  name: string;
  what: string;
  groupPath: string;
  state: ProjectState;
  setupStep: string | null;
  /** Listing order from the importer; null sorts last. */
  ord: number | null;
  armed: number;
  /** null: unknown, never zero. */
  proofs7d: ProofCounts | null;
  demotions7d: number | null;
  needsYou: number;
  craOpen: number;
  envStaging: string | null;
  envProduction: string | null;
  last: { at: Date; track: string; text: string } | null;
}

const SPEC: TableSpec = {
  table: 'project',
  key: ['id'],
  cols: {
    id: 'text', gitlab_id: 'int', name: 'text', what: 'text', group_path: 'text', state: 'text', setup_step: 'text',
    ord: 'int', armed: 'int', proofs_pass_7d: 'int', proofs_fail_7d: 'int', proofs_inconclusive_7d: 'int',
    demotions_7d: 'int', needs_you: 'int', cra_open: 'int', env_staging: 'text', env_production: 'text',
    last_at: 'timestamptz', last_track: 'text', last_text: 'text',
  },
};

interface Db {
  id: string; gitlab_id: number | null; name: string; what: string; group_path: string; state: ProjectState;
  setup_step: string | null; ord: number | null; armed: number;
  proofs_pass_7d: number | null; proofs_fail_7d: number | null; proofs_inconclusive_7d: number | null;
  demotions_7d: number | null; needs_you: number; cra_open: number;
  env_staging: string | null; env_production: string | null;
  last_at: Date | null; last_track: string | null; last_text: string | null;
}

const toDb = (p: ProjectRow): Record<string, unknown> => ({
  id: p.id, gitlab_id: p.gitlabId, name: p.name, what: p.what, group_path: p.groupPath, state: p.state,
  setup_step: p.setupStep, ord: p.ord, armed: p.armed,
  proofs_pass_7d: p.proofs7d?.pass ?? null, proofs_fail_7d: p.proofs7d?.fail ?? null,
  proofs_inconclusive_7d: p.proofs7d?.inconclusive ?? null,
  demotions_7d: p.demotions7d, needs_you: p.needsYou, cra_open: p.craOpen,
  env_staging: p.envStaging, env_production: p.envProduction,
  last_at: toIso(p.last?.at), last_track: p.last?.track ?? null, last_text: p.last?.text ?? null,
});

const fromDb = (r: Db): ProjectRow => ({
  id: r.id, gitlabId: r.gitlab_id, name: r.name, what: r.what, groupPath: r.group_path, state: r.state,
  setupStep: r.setup_step, ord: r.ord, armed: r.armed,
  proofs7d:
    r.proofs_pass_7d === null || r.proofs_fail_7d === null || r.proofs_inconclusive_7d === null
      ? null
      : { pass: r.proofs_pass_7d, fail: r.proofs_fail_7d, inconclusive: r.proofs_inconclusive_7d },
  demotions7d: r.demotions_7d, needsYou: r.needs_you, craOpen: r.cra_open,
  envStaging: r.env_staging, envProduction: r.env_production,
  last: r.last_at && r.last_track !== null && r.last_text !== null ? { at: asDate(r.last_at) as Date, track: r.last_track, text: r.last_text } : null,
});

/** Groups must exist first (see upsertGroups). Rows with the same id are overwritten. */
export const upsertProjects = (db: Queryable, rows: readonly ProjectRow[]): Promise<void> => upsertRows(db, SPEC, rows.map(toDb));

export async function listProjects(db: Queryable): Promise<ProjectRow[]> {
  const { rows } = await db.query<Db>('select * from project order by ord nulls last, id');
  return rows.map(fromDb);
}

export async function getProjectRow(db: Queryable, id: string): Promise<ProjectRow | null> {
  const { rows } = await db.query<Db>('select * from project where id = $1', [id]);
  const r = rows[0];
  return r ? fromDb(r) : null;
}
