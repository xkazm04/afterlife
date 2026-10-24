// STUB - content package fills this
// Maturity: the nine DevSecOps stages.
import type { Callout } from '../../../model/types';
import { helpCallout } from '../../shared';

export const MATURITY: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Maturity',
    body: () => 'How far up each of the nine DevSecOps stages does this project’s evidence reach, and which gap is worth closing next?',
  },
  helpCallout,
];
