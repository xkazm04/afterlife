import type { ClickCopy, DiffLine, WriteSpec } from './types';

const FILE = 'belay-policy/tier-state.yml';
const OLD: DiffLine = ['-', '    patch-bump: { tier: quarantined, by: tripwire, reason: guardrail_high, evidence: "!44#note_5" }'];

const readmit: WriteSpec = {
  ref: 'belay-policy!22',
  file: FILE,
  commands: [
    'git -C belay-policy switch -c belay/readmit-gardener-patch-bump',
    'git -C belay-policy commit -am "Re-admit ai-gardener-acme patch-bump as assisted after reading !44#note_5"',
    'git -C belay-policy push -u origin belay/readmit-gardener-patch-bump',
    'glab mr create -R acme-lab/belay-policy --title "Re-admit ai-gardener-acme patch-bump: quarantined → assisted" --fill',
  ],
  diff: [
    [' ', '  ai-gardener-acme:'],
    OLD,
    ['+', '    patch-bump: { tier: assisted, by: "@operator via re-admission MR belay-policy!22", read: "!44#note_5" }'],
  ],
  result: 'belay-policy!22 opened as @operator. patch-bump stays QUARANTINED until you merge it.',
};

/** Retire runs on the click (restricting is free): one commit, no outbox. */
const retire: WriteSpec = {
  ref: 'belay-policy main',
  file: FILE,
  commands: ['git -C belay-policy commit -am "Retire ai-gardener-acme patch-bump"', 'git -C belay-policy push origin main'],
  diff: [[' ', '  ai-gardener-acme:'], OLD, ['+', '    patch-bump: { tier: retired, by: "@operator" }']],
  result: 'Committed to belay-policy main as @operator. patch-bump is retired.',
};

/** n4, re-admit a quarantined class after a guardrail trip (seeded). Timeline rows: time, track, text. */
export const READMIT: ClickCopy & {
  openedAt: string;
  track: string;
  mr: string;
  note: string;
  timeline: readonly (readonly [string, string, string])[];
  cooldown: string;
  readmit: WriteSpec;
  retire: WriteSpec;
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
  readmit,
  retire,
  does: ['Re-admit: opens a re-admission MR as you, at Assisted', 'Retire: one commit as you. Restricting is free'],
  doesNot: ['restore Supervised, the old tier', 'lift the 7-day promotion cooldown', 'reopen or merge !44'],
};
