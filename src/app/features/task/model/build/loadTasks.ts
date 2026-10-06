import { getActionClasses, getTasks, getTracks } from '@/lib/demo';
import { TASK_DETAIL, TASK_ORDER } from '../../data/details';
import type { TaskView } from '../types';
import { buildTasks } from './buildTasks';

/** The seven docket tasks: the demo dataset merged with this screen's fixtures. Runs on the server (route files). */
export function loadTasks(): TaskView[] {
  return buildTasks({
    tasks: getTasks(),
    tracks: getTracks(),
    actionClasses: getActionClasses(),
    details: TASK_DETAIL,
    order: TASK_ORDER,
  });
}

/** The id /task redirects to. */
export function firstTaskId(): string | null {
  return loadTasks()[0]?.id ?? null;
}
