import type { ClickCopy } from './types';

/**
 * n4, re-admit a quarantined class after a guardrail trip (seeded). Timeline rows: time, track, text. The re-admission
 * MR is planned by the server (a promote-class to Assisted, write/promote.ts); Retire has no write (model/act.ts).
 */
export const READMIT: ClickCopy & {
  openedAt: string;
  track: string;
  mr: string;
  note: string;
  timeline: readonly (readonly [string, string, string])[];
  cooldown: string;
} = {
  openedAt: '14:20',
  track: 'T8',
  mr: '!44',
  note: '!44#note_5',
  timeline: [
    ['14:20', 'T3', 'tripwire: patch-bump → Quarantined · e7f19d0, no person'],
    ['14:21', 'T4', 'guardrail blocked !44 · hidden instruction quoted'],
    ['14:22', '—', 'flow disabled for write classes'],
  ],
  cooldown: '7 d before any promotion',
  does: ['Re-admit: opens a re-admission MR as you, at Assisted', 'Retire: records the decision here; Belay has no retire write'],
  doesNot: ['restore Supervised, the old tier', 'lift the 7-day promotion cooldown', 'reopen or merge !44'],
};
