// STUB - content package fills this
// Onboard: the estate, a batch at a time.
import type { Callout } from '../../../model/types';
import { helpCallout } from '../../shared';

export const ONBOARD: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Onboard',
    body: () => 'How far is the estate onboarded, what runs in the next batch, and what can only I do?',
  },
  helpCallout,
];
