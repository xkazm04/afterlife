import { getDataSource } from '@/server/data';
import { TASK_DETAIL, TASK_ORDER } from '../../data/details';
import type { TaskView } from '../types';
import { buildTasks } from './buildTasks';

/** The docket: the data source's tasks merged with this screen's fixtures (a task with no fixture is not drawn). Runs on the server. */
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

/** The id /task redirects to. */
export function firstTaskId(): string | null {
  return loadTasks()[0]?.id ?? null;
}
