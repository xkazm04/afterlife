// The stability of each polled project's agent MRs over the last 7 days (src/lib/stability): the tasks started in the
// window (a task is an agent MR, poller/derive/task.ts), folded from the size and head pipeline the poller stores on
// each (poller/mrFacts). Every project the poller links to GitLab has an entry (n 0: no agent MR in the window); a project
// never polled has none (unknown). Per project only, never per person.
import { foldStability, type MrFact, type PipelineState, type Stability } from '@/lib/stability/stability';
import type { TaskDetail } from '../../repositories/work/task';
import type { Queryable } from '../../repositories/sql';

export const STABILITY_WINDOW_MS = 7 * 24 * 3600 * 1000;

const PIPELINES = new Set<PipelineState>(['success', 'failed', 'canceled', 'running']);

/** A stored detail's facts; a row from before mrFacts (no keys) reads as unknown. */
export function factOf(state: string | null, detail: TaskDetail | null): MrFact {
  const size = typeof detail?.size === 'number' ? detail.size : null;
  const pipeline = detail?.pipeline && PIPELINES.has(detail.pipeline) ? detail.pipeline : null;
  return { size, pipeline, reverted: state === 'reverted' };
}

/** Stability by project id, for the projects linked to GitLab. `now` fixes the window's end. */
export async function getStability(db: Queryable, now: Date = new Date()): Promise<Record<string, Stability>> {
  const since = new Date(now.getTime() - STABILITY_WINDOW_MS).toISOString();
  const [projects, tasks] = await Promise.all([
    db.query<{ id: string }>('select id from project where gitlab_id is not null'),
    db.query<{ project_id: string; state: string | null; detail: TaskDetail | null }>(
      'select project_id, state, detail from task where mr_iid is not null and started_at >= $1 and started_at <= $2',
      [since, now.toISOString()],
    ),
  ]);
  const facts = new Map<string, MrFact[]>(projects.rows.map((p) => [p.id, []]));
  for (const t of tasks.rows) facts.get(t.project_id)?.push(factOf(t.state, t.detail));
  return Object.fromEntries([...facts].map(([id, list]) => [id, foldStability(list)]));
}
