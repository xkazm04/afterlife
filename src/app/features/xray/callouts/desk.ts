// Needs you and Monitor: the two screens about what waits for you now.
import type { Callout } from '../model/types';
import { helpCallout, statusCallout } from './shared';

const DECISIONS = '[role="treegrid"][aria-label="Decisions"]';
const LEADS = '[aria-label="Leads, one per group"]';

export const NEEDS_YOU: readonly Callout[] = [
  {
    id: 'group-by',
    sel: '[role="radiogroup"][aria-label="Group by"]',
    title: 'Three ways to sort the desk',
    body: () => 'The same decisions, grouped by kind, by project, or by the deadline they are on.',
    try: 'Click By deadline',
  },
  {
    id: 'clock',
    sel: 'section[aria-label="CRA legal clock"]',
    title: 'A decision on a clock',
    body: (r) => `The one decision with a legal deadline, ${r.text('[role="timer"]') || 'counting down'} left. In the demo it is a seeded drill; its buttons open the draft and the sign-off.`,
  },
  {
    id: 'rows',
    sel: DECISIONS,
    title: 'Every decision, one row each',
    body: () => 'Each row says the move, what it would write in GitLab, which agent asks, and when. Grouped rows fold.',
    try: '↑ ↓ move between decisions',
  },
  {
    id: 'act',
    sel: `${DECISIONS} [role="row"] button:not([role])`,
    title: 'Your click',
    body: () => 'A row’s button stages its exact write for you to read. Nothing reaches GitLab until you press Run in the Outbox.',
  },
  {
    id: 'outbox',
    sel: 'section[aria-label="Outbox"]',
    title: 'The Outbox',
    body: (r) => `Staged writes wait here with their command, run as you. ${/\b0\b/.test(r.text('section[aria-label="Outbox"]')) ? 'Empty now: nothing is staged.' : ''}`,
  },
  statusCallout('The desk in one line', 'Waiting, on a clock, in the outbox: the counts the sidebar filters by.'),
  helpCallout,
];

export const MONITOR: readonly Callout[] = [
  {
    id: 'leads',
    sel: LEADS,
    title: 'One lead per group',
    body: (r) => `${r.count(`${LEADS} rect[role="button"]`)} projects drawn as beats, one lead per GitLab subgroup. An amber spike is a project with decisions waiting.`,
  },
  {
    id: 'beat',
    sel: `${LEADS} rect[role="button"]`,
    title: 'One project',
    body: () => 'Hover a beat to name it; click it to load that project in the inspector on the right.',
    try: 'Click a beat',
  },
  {
    id: 'inspector',
    sel: '[id$="inspector"]',
    title: 'The inspector',
    body: () => 'The selected project: what waits on it with the same buttons as Needs you, its signal, and links to the other screens.',
    try: 'Ctrl+I or ⌘I hides it',
  },
  {
    id: 'sweep',
    sel: '[aria-label="Sweep animation"]',
    title: 'Sweep',
    body: () => 'The moving scan line. Switch it off if motion distracts you; the data does not change.',
  },
  statusCallout('The monitor in one line', 'Projects, leads, decisions and the poll age.'),
  helpCallout,
];
