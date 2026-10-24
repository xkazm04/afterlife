// STUB - content package fills this
// Monitor: the fleet as live leads, one beat per project.
import type { Callout } from '../../../model/types';
import { helpCallout, statusCallout } from '../../shared';

const LEADS = '[aria-label="Leads, one per group"]';

export const MONITOR: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Monitor',
    body: () => 'What is waiting for a person right now, and which project is it on?',
  },
  {
    id: 'leads',
    kind: 'activity',
    sel: LEADS,
    title: 'One lead per group',
    body: (r) => `${r.count(`${LEADS} rect[role="button"]`)} projects drawn as beats, one lead per GitLab subgroup. An amber spike is a project with decisions waiting.`,
  },
  {
    id: 'beat',
    kind: 'activity',
    sel: `${LEADS} rect[role="button"]`,
    title: 'One project',
    body: () => 'Hover a beat to name it; click it to load that project in the inspector on the right.',
    try: 'Click a beat',
  },
  {
    id: 'inspector',
    kind: 'activity',
    sel: '[id$="inspector"]',
    title: 'The inspector',
    body: () => 'The selected project: what waits on it with the same buttons as Needs you, its signal, and links to the other screens.',
    try: 'Ctrl+I or ⌘I hides it',
  },
  {
    id: 'sweep',
    kind: 'activity',
    sel: '[aria-label="Sweep animation"]',
    title: 'Sweep',
    body: () => 'The moving scan line. Switch it off if motion distracts you; the data does not change.',
  },
  statusCallout('The monitor in one line', 'Projects, leads, decisions and the poll age.'),
  helpCallout,
];
