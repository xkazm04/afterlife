// STUB - content package fills this
// Cycles: the improvement rounds.
import type { Callout } from '../../../model/types';
import { helpCallout } from '../../shared';

export const CYCLES: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Cycles',
    body: () => 'What has each round of improvement earned, does the history add up to the latest scan, and what runs next?',
  },
  helpCallout,
];
