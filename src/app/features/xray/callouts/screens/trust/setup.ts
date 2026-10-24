// STUB - content package fills this
// Setup: what blocks each track on one project, and what can only you do.
import type { Callout } from '../../../model/types';
import { NAV, helpCallout } from '../../shared';

export const SETUP: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Setup',
    body: () => 'What blocks each track on one project, and what can only I do?',
  },
  {
    id: 'doctor',
    kind: 'activity',
    sel: '[role="group"][aria-label="belay doctor"]',
    title: 'What GitLab offers',
    body: (r) => `belay doctor’s probes: ${r.text('[role="group"][aria-label="belay doctor"]')}. On demo data they are simulated; live, they read your group.`,
  },
  {
    id: 'stand',
    kind: 'activity',
    sel: 'section[aria-label="Where you stand"]',
    title: 'Where you stand',
    body: () => 'Tracks armed, ready and locked, then the steps only you can do, in amber, each with its step number.',
  },
  {
    id: 'path',
    kind: 'activity',
    sel: '[aria-label="Path · steps 0–14"]',
    title: 'The 15-step path',
    body: () => 'Prepare, Connect, Install, Prove. Click a step for its own page: its command and what clears it.',
    try: 'Click a step',
  },
  {
    id: 'tracks',
    kind: 'activity',
    sel: '[aria-label="Tracks · arm order"]',
    title: 'Eight agents, in arm order',
    body: () => 'A track arms when the steps and capabilities it hangs on are there; the lines show which.',
  },
  {
    id: 'caps',
    kind: 'activity',
    sel: '[aria-label="GitLab · belay doctor"]',
    title: 'One capability per row',
    body: () => 'Dashed rows are unknown, never counted as available.',
  },
  {
    id: 'own',
    kind: 'activity',
    sel: `${NAV} a[href="/trace"]`,
    title: 'Your own group',
    body: () => 'This map is the demo’s. Trace walks your machine, your GitLab login and your group, one real probe at a time.',
    try: 'Click Trace',
  },
  helpCallout,
];
