import type { TaskDetail } from '../../model/types';
import { Q4 } from './q4';
import { Q7 } from './q7';
import { Q8 } from './q8';
import { Q9 } from './q9';
import { QA } from './qa';
import { QB } from './qb';
import { QC } from './qc';

/** Task ids in docket order. The first one is where /task redirects. */
export const TASK_ORDER = ['01J8Q4', '01J8Q9', '01J8Q8', '01J8QB', '01J8QC', '01J8QA', '01J8Q7'] as const;

export const TASK_DETAIL: Record<string, TaskDetail> = {
  '01J8Q4': Q4,
  '01J8Q9': Q9,
  '01J8Q8': Q8,
  '01J8QB': QB,
  '01J8QC': QC,
  '01J8QA': QA,
  '01J8Q7': Q7,
};
