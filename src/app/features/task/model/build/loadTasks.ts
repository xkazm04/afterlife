import { getDataSource } from '@/server/data';
import { TASK_DETAIL, TASK_ORDER } from '../../data/details';
import type { TaskView } from '../types';
import { buildTasks } from './buildTasks';
import { chainLedgers } from './chain/taskLedger';

/**
 * The docket: the data source's tasks merged with this screen's fixtures, and every source task with no fixture drawn from
 * its own fields. In live mode only the source's own tasks are drawn, and each task's ledger is its merge request's slice of
 * the real chain (`getLedger()`), verified here. Runs on the server: the chain module hashes with node:crypto.
 */
export function loadTasks(): TaskView[] {
  const ds = getDataSource();
  const live = ds.mode === 'live';
  return buildTasks({
    tasks: ds.getTasks(),
    tracks: ds.getTracks(),
    actionClasses: ds.getActionClasses(),
    details: TASK_DETAIL,
    order: TASK_ORDER,
    live,
    ...(live ? { ledgerFor: chainLedgers(ds.getLedger()) } : {}),
  });
}

/** The id /task redirects to: the first task the docket draws, or null when it draws none. */
export function firstTaskId(): string | null {
  return loadTasks()[0]?.id ?? null;
}
