// Ladder and Setup: what each agent may do, and what stands between a project and its agents.
import type { Callout } from '../model/types';
import { NAV, helpCallout, statusCallout } from './shared';

const CLASSES = '[role="treegrid"][aria-label="Action classes"]';

export const LADDER: readonly Callout[] = [
  {
    id: 'tiers',
    sel: '[role="radiogroup"][aria-label="Filter by tier"]',
    title: 'Filter by tier',
    body: (r) => `${(r.text('[role="radiogroup"][aria-label="Filter by tier"]').match(/\d+/) ?? ['?'])[0]} action classes. H Hands-off, S Supervised, A Assisted, Q Quarantined, P Human only: a tier is always a letter and a colour.`,
    try: 'Click Q',
  },
  {
    id: 'policy',
    sel: '[aria-label="Policy"]',
    title: 'The policy in force',
    body: (r) => `"${r.text('[aria-label="Policy"]')}": the policy version and the tripwire every tier on this screen is read from.`,
  },
  {
    id: 'classes',
    sel: CLASSES,
    title: 'Every action class',
    body: () => 'Grouped under the agent that owns it. Each row: tier, ceiling, record, and its last move.',
    try: 'j k or ↑ ↓ move',
  },
  {
    id: 'revoke',
    sel: `${CLASSES} button[aria-label^="Revoke"]`,
    title: 'Take autonomy back',
    body: () => 'Revoke lowers a class one tier. Like every write it shows its exact command first and runs only on your click.',
  },
  {
    id: 'dock',
    sel: '[data-xray="dock"]',
    title: 'The next key, spelled out',
    body: () => 'The exact command the highlighted row’s key would run, shown before you press it.',
  },
  statusCallout('Where the tiers come from', 'The file and policy the tiers were read from, and when.'),
  helpCallout,
];

export const SETUP: readonly Callout[] = [
  {
    id: 'doctor',
    sel: '[role="group"][aria-label="belay doctor"]',
    title: 'What GitLab offers',
    body: (r) => `belay doctor’s probes: ${r.text('[role="group"][aria-label="belay doctor"]')}. On demo data they are simulated; live, they read your group.`,
  },
  {
    id: 'stand',
    sel: 'section[aria-label="Where you stand"]',
    title: 'Where you stand',
    body: () => 'Tracks armed, ready and locked, then the steps only you can do, in amber, each with its step number.',
  },
  {
    id: 'path',
    sel: '[aria-label="Path · steps 0–14"]',
    title: 'The 15-step path',
    body: () => 'Prepare, Connect, Install, Prove. Click a step for its own page: its command and what clears it.',
    try: 'Click a step',
  },
  {
    id: 'tracks',
    sel: '[aria-label="Tracks · arm order"]',
    title: 'Eight agents, in arm order',
    body: () => 'A track arms when the steps and capabilities it hangs on are there; the lines show which.',
  },
  {
    id: 'caps',
    sel: '[aria-label="GitLab · belay doctor"]',
    title: 'One capability per row',
    body: () => 'Dashed rows are unknown, never counted as available.',
  },
  {
    id: 'own',
    sel: `${NAV} a[href="/trace"]`,
    title: 'Your own group',
    body: () => 'This map is the demo’s. Trace walks your machine, your GitLab login and your group, one real probe at a time.',
    try: 'Click Trace',
  },
  helpCallout,
];
