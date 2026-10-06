import type { Task } from '@/lib/demo/types';
import type { Ceiling } from '@/schemas/tier';
import { asDate, toIso, upsertRows, type Queryable, type TableSpec } from '../sql';

export type TaskState = 'started' | 'proved' | 'blocked' | 'merged' | 'reverted' | 'closed';

/** Display facts derived when the task was imported. A countdown is stored as its due instant, never as text. */
export type TaskDetail = Partial<Pick<Task, 'chain' | 'agentWords' | 'countsToward' | 'quote' | 'reason' | 'stats' | 'grade' | 'linksResolved'>> & {
  clock?: { kind: string; dueAt: string; total: string };
};

export interface TaskRow {
  id: string;
  projectId: string;
  track: number | null;
  agent: string | null;
  actionClass: string | null;
  mrIid: number | null;
  title: string;
  /** The tier the task ran under, not today's. null: unknown. */
  tierAtTime: Ceiling | null;
  state: TaskState | null;
  stateLabel: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  detail: TaskDetail;
}

const SPEC: TableSpec = {
  table: 'task',
  key: ['id'],
  cols: {
    id: 'text', project_id: 'text', track: 'smallint', agent: 'text', action_class: 'text', mr_iid: 'int', title: 'text',
    tier_at_time: 'text', state: 'text', state_label: 'text', started_at: 'timestamptz', finished_at: 'timestamptz', detail: 'jsonb',
  },
};

interface Db {
  id: string; project_id: string; track: number | null; agent: string | null; action_class: string | null;
  mr_iid: number | null; title: string; tier_at_time: Ceiling | null; state: TaskState | null; state_label: string | null;
  started_at: Date | null; finished_at: Date | null; detail: TaskDetail;
}

const toDb = (t: TaskRow): Record<string, unknown> => ({
  id: t.id, project_id: t.projectId, track: t.track, agent: t.agent, action_class: t.actionClass, mr_iid: t.mrIid,
  title: t.title, tier_at_time: t.tierAtTime, state: t.state, state_label: t.stateLabel,
  started_at: toIso(t.startedAt), finished_at: toIso(t.finishedAt), detail: t.detail,
});

const fromDb = (r: Db): TaskRow => ({
  id: r.id, projectId: r.project_id, track: r.track, agent: r.agent, actionClass: r.action_class, mrIid: r.mr_iid,
  title: r.title, tierAtTime: r.tier_at_time, state: r.state, stateLabel: r.state_label,
  startedAt: asDate(r.started_at), finishedAt: asDate(r.finished_at), detail: r.detail,
});

export const upsertTasks = (db: Queryable, rows: readonly TaskRow[]): Promise<void> => upsertRows(db, SPEC, rows.map(toDb));

/** A project's tasks in the order they were first indexed. */
export async function listTasks(db: Queryable, projectId: string): Promise<TaskRow[]> {
  const { rows } = await db.query<Db>('select * from task where project_id = $1 order by ord', [projectId]);
  return rows.map(fromDb);
}

export async function getTaskRow(db: Queryable, id: string): Promise<TaskRow | null> {
  const { rows } = await db.query<Db>('select * from task where id = $1', [id]);
  const r = rows[0];
  return r ? fromDb(r) : null;
}
