import { getDataSource } from '@/server/data';
import { TASK_DETAIL, TASK_ORDER } from '../../data/details';
import type { TaskView } from '../types';
import { buildTasks } from './buildTasks';

/**
 * The docket: the data source's tasks merged with this screen's fixtures, and every source task with no fixture drawn from
 * its own fields. Runs on the server.
 */
export function loadTasks(): TaskView[] {
  const ds = getDataSource();
  return buildTasks({
    tasks: ds.getTasks(),
    tracks: ds.getTracks(),
    actionClasses: ds.getActionClasses(),
    details: TASK_DETAIL,
    order: TASK_ORDER,
  });
}

/** The id /task redirects to: the data source's first task (every one is drawn), or null when it has none. */
export function firstTaskId(): string | null {
  return getDataSource().getTasks()[0]?.id ?? null;
}
