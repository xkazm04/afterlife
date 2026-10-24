// STUB - content package fills this
// Trace: setting up your first project as one wire.
import type { Callout } from '../../../model/types';
import { helpCallout } from '../../shared';

export const TRACE: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Trace',
    body: () => 'Is this machine, my GitLab login and my group ready, one real probe at a time?',
  },
  helpCallout,
];
