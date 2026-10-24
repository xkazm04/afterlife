// STUB - content package fills this
// Runs: the agent runs, newest first.
import type { Callout } from '../../../model/types';
import { helpCallout } from '../../shared';

export const RUNS: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Runs',
    body: () => 'What did the agents run, and how did each run end?',
  },
  helpCallout,
];
