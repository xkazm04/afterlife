import { getDataSource } from '@/server/data';
import { TASK_DETAIL, TASK_ORDER } from '../../data/details';
import type { TaskView } from '../types';
import { buildTasks } from './buildTasks';

/**
 * The docket: the data source's tasks merged with this screen's fixtures, and every source task with no fixture drawn from
 * its own fields. In live mode only the source's own tasks are drawn. Runs on the server.
 */
export function loadTasks(): TaskView[] {
  const ds = getDataSource();
  return buildTasks({
    tasks: ds.getTasks(),
    tracks: ds.getTracks(),
    actionClasses: ds.getActionClasses(),
    details: TASK_DETAIL,
    order: TASK_ORDER,
    live: ds.mode === 'live',
  });
}

/** The id /task redirects to: the first task the docket draws, or null when it draws none. */
export function firstTaskId(): string | null {
  return loadTasks()[0]?.id ?? null;
}
