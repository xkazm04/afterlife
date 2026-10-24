// STUB - content package fills this
// Theater: a deterministic replay.
import type { Callout } from '../../../model/types';
import { helpCallout } from '../../shared';

export const THEATER: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Theater',
    body: () => 'What does one change look like as it climbs the whole loop, from finding to production, with proofs and a caught fault along the way?',
  },
  helpCallout,
];
