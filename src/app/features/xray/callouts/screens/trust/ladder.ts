// STUB - content package fills this
// Ladder: what each agent may do now, and how to take it away.
import type { Callout } from '../../../model/types';
import { helpCallout, statusCallout } from '../../shared';

const CLASSES = '[role="treegrid"][aria-label="Action classes"]';

export const LADDER: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Ladder',
    body: () => 'What may each agent do now, and how do I take it away?',
  },
  {
    id: 'policy',
    kind: 'activity',
    sel: '[aria-label="Policy"]',
    title: 'The policy in force',
    body: (r) => `"${r.text('[aria-label="Policy"]')}": the policy version and the tripwire every tier on this screen is read from.`,
  },
  {
    id: 'classes',
    kind: 'activity',
    sel: CLASSES,
    title: 'Every action class',
    body: () => 'Grouped under the agent that owns it. Each row: tier, ceiling, record, and its last move.',
    try: 'j k or ↑ ↓ move',
  },
  {
    id: 'revoke',
    kind: 'activity',
    sel: `${CLASSES} button[aria-label^="Revoke"]`,
    title: 'Take autonomy back',
    body: () => 'Revoke lowers a class one tier. Like every write it shows its exact command first and runs only on your click.',
  },
  {
    id: 'dock',
    kind: 'activity',
    sel: '[data-xray="dock"]',
    title: 'The next key, spelled out',
    body: () => 'The exact command the highlighted row’s key would run, shown before you press it.',
  },
  statusCallout('Where the tiers come from', 'The file and policy the tiers were read from, and when.'),
  helpCallout,
];
