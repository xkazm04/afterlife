// STUB - content package fills this
// Task: one agent task and its proof.
import type { Callout } from '../../../model/types';
import { helpCallout } from '../../shared';

export const TASK: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Task',
    body: () => 'Does this agent task’s proof hold up, check by check, against what the agent claimed?',
  },
  helpCallout,
];
