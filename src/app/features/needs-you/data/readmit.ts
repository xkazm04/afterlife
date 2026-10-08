import type { ClickCopy } from './types';

/**
 * n4, re-admit a quarantined class after a guardrail trip (seeded). Timeline rows: time, track, text. The re-admission
 * MR is planned by the server (a promote-class to Assisted, write/promote.ts); Retire has no write (model/act.ts).
 */
export const READMIT: Pick<ClickCopy, 'does'> & {
  openedAt: string;
  track: string;
  mr: string;
  note: string;
  timeline: readonly (readonly [string, string, string])[];
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
  does: ['Re-admit: opens a re-admission MR as you, at Assisted', 'Retire: records the decision here; Belay has no retire write'],
};

/**
 * The cooldown lines, from trust-policy.yml's cooldown_days as the server read it (null: not read). planPromote keeps the
 * record's cooldown_until on a re-admission and refuses any promotion before it (server/actions/plans/promote.ts).
 */
export function readmitCooldown(days: number | null): { cooldown: string; doesNot: readonly string[] } {
  return {
    cooldown: days === null ? 'not known: trust-policy.yml was not read' : `${days} d before any promotion`,
    doesNot: ['restore Supervised, the old tier', days === null ? 'lift the promotion cooldown' : `lift the ${days}-day promotion cooldown`, 'reopen or merge !44'],
  };
}
