// STUB - content package fills this
// Needs you: what waits for you, and what your click will write.
import type { Callout } from '../../../model/types';
import { helpCallout, statusCallout } from '../../shared';

const DECISIONS = '[role="treegrid"][aria-label="Decisions"]';

export const NEEDS_YOU: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Needs you',
    body: () => 'What waits for a person right now, and what will my click do?',
  },
  {
    id: 'clock',
    kind: 'activity',
    sel: 'section[aria-label="CRA legal clock"]',
    title: 'A decision on a clock',
    body: (r) => `The one decision with a legal deadline, ${r.text('[role="timer"]') || 'counting down'} left. In the demo it is a seeded drill; its buttons open the draft and the sign-off.`,
  },
  {
    id: 'rows',
    kind: 'activity',
    sel: DECISIONS,
    title: 'Every decision, one row each',
    body: () => 'Each row says the move, what it would write in GitLab, which agent asks, and when. Grouped rows fold.',
    try: '↑ ↓ move between decisions',
  },
  {
    id: 'act',
    kind: 'activity',
    sel: `${DECISIONS} [role="row"] button:not([role])`,
    title: 'Your click',
    body: () => 'A row’s button stages its exact write for you to read. Nothing reaches GitLab until you press Run in the Outbox.',
  },
  {
    id: 'outbox',
    kind: 'activity',
    sel: 'section[aria-label="Outbox"]',
    title: 'The Outbox',
    body: (r) => `Staged writes wait here with their command, run as you. ${/\b0\b/.test(r.text('section[aria-label="Outbox"]')) ? 'Empty now: nothing is staged.' : ''}`,
  },
  statusCallout('The desk in one line', 'Waiting, on a clock, in the outbox: the counts the sidebar filters by.'),
  helpCallout,
];
