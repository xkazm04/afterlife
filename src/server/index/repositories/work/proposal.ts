import { asDate, toIso, upsertRows, type Queryable, type TableSpec } from '../sql';

export type ProposalKind = 'promotion' | 'cra_signoff' | 'gap' | 'readmit' | 'setup_gate';
export type ProposalState = 'open' | 'acted' | 'dismissed' | 'expired';

export interface ProposalRow {
  id: string;
  projectId: string;
  kind: ProposalKind;
  state: ProposalState;
  /** A gap pick belongs to the one 'gap' inbox item. */
  parentId: string | null;
  title: string;
  /** Kind-specific display facts (rules, from/to, stage, picked...). */
  subject: Record<string, unknown>;
  /** A deadline; countdowns are computed from it at read time. */
  dueAt: Date | null;
  openedAt: Date;
  actedAt: Date | null;
  /** The operator's GitLab user. */
  actedAs: string | null;
}

const SPEC: TableSpec = {
  table: 'proposal',
  key: ['id'],
  cols: {
    id: 'text', project_id: 'text', kind: 'text', state: 'text', parent_id: 'text', title: 'text', subject: 'jsonb',
    due_at: 'timestamptz', opened_at: 'timestamptz', acted_at: 'timestamptz', acted_as: 'text',
  },
};

interface Db {
  id: string; project_id: string; kind: ProposalKind; state: ProposalState; parent_id: string | null; title: string;
  subject: Record<string, unknown>; due_at: Date | null; opened_at: Date; acted_at: Date | null; acted_as: string | null;
}

const fromDb = (r: Db): ProposalRow => ({
  id: r.id, projectId: r.project_id, kind: r.kind, state: r.state, parentId: r.parent_id, title: r.title,
  subject: r.subject, dueAt: asDate(r.due_at), openedAt: asDate(r.opened_at) as Date,
  actedAt: asDate(r.acted_at), actedAs: r.acted_as,
});

/** Parents before their children when both are in `rows`. */
export const upsertProposals = (db: Queryable, rows: readonly ProposalRow[]): Promise<void> =>
  upsertRows(db, SPEC, rows.map((p) => ({
    id: p.id, project_id: p.projectId, kind: p.kind, state: p.state, parent_id: p.parentId, title: p.title,
    subject: p.subject, due_at: toIso(p.dueAt), opened_at: toIso(p.openedAt), acted_at: toIso(p.actedAt), acted_as: p.actedAs,
  })));

/** Open items of one project, oldest first. `children` selects gap picks instead of top-level inbox items. */
export async function listOpenProposals(db: Queryable, projectId: string, children = false): Promise<ProposalRow[]> {
  const { rows } = await db.query<Db>(
    `select * from proposal where project_id = $1 and state = 'open' and (parent_id is not null) = $2 order by opened_at, ord`,
    [projectId, children],
  );
  return rows.map(fromDb);
}

/** Records that the operator acted on (or dismissed) a proposal. Returns false if it was not open. */
export async function closeProposal(
  db: Queryable, id: string, state: Exclude<ProposalState, 'open'>, at: Date, actedAs: string | null,
): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `update proposal set state = $2, acted_at = $3::timestamptz, acted_as = $4 where id = $1 and state = 'open' returning id`,
    [id, state, at.toISOString(), actedAs],
  );
  return rows.length === 1;
}
