// The prototype's invented constants for the Theater, as typed data (no logic).
import type { Ceiling } from '@/schemas';
import type { Actor, CheckId, NeedItem, Take } from '../model/types';

/** Who is speaking, as the caption and inspector name them. */
export const WHO: Record<Actor, string> = {
  T1: 'T1 patcher',
  T2: 'T2 CRA',
  T3: 'T3 governor',
  T4: 'T4 guardrail',
  T5: 'T5 medic',
  T6: 'T6 maturity',
  T7: 'T7 QA',
  T8: 'T8 gardener',
  scanner: 'scanner',
  engine: 'proof engine · no model',
  deploy: 'deploy',
  belay: 'Belay',
};

/** The short tag in the inspector's ledger list. */
export const BY_SHORT: Partial<Record<Actor, string>> = { scanner: 'scan', engine: 'PE', deploy: 'deploy', belay: 'Belay' };

/** The storyboard cut into takes 1-8 (keys 1-8). Take 6 is the seeded !44 line. */
export const TAKES: readonly Take[] = [
  { name: 'Finding', a: 480, b: 484 },
  { name: 'Red test', a: 485, b: 487 },
  { name: 'Green + Proof Block', a: 488, b: 496 },
  { name: 'Guardrail + merge', a: 497, b: 500 },
  { name: 'Staging + QA', a: 501, b: 504 },
  { name: '!44 caught · demotion', a: 505, b: 513, seeded: true },
  { name: 'Production + summary', a: 514, b: 518 },
  { name: 'Close · nine stages', a: 519, b: 520 },
];

/** The five proof checks of !41, in the order the engine runs them. */
export const CHECKS: readonly CheckId[] = ['base-red', 'head-green', 'not-weakened', 'envelope', 'rescan'];

/** The three action classes shown under Autonomy: [track, class]. */
export const SHOW_CLASSES: readonly (readonly [string, string])[] = [
  ['T1', 'dep-bump.patch'],
  ['T7', 'qa.file-bug'],
  ['T8', 'patch-bump'],
];

const INITIAL_NEEDS: readonly NeedItem[] = [
  { k: 'gaps', label: 'pick gaps · T6 maturity', since: '12:14:00' },
  { k: 'signoff', label: 'CRA sign-off · seeded drill', since: '13:58:00' },
];
const INITIAL_TIERS: Readonly<Record<string, Ceiling>> = {
  'dep-bump.patch': 'hands_off',
  'qa.file-bug': 'supervised',
  'patch-bump': 'supervised',
};
const INITIAL_RUNGS: Readonly<Record<string, number>> = {
  plan: 1,
  create: 2,
  verify: 3,
  package: 2,
  secure: 2,
  release: 1,
  configure: 2,
  monitor: 1,
  govern: 3,
};

/** The fold starts here, before seq 480. */
export const INITIAL = {
  now: 'idle · watching pipelines',
  pass: 30,
  fail: 1,
  needs: INITIAL_NEEDS,
  tiers: INITIAL_TIERS,
  rungs: INITIAL_RUNGS,
};

/** The CRA early-warning clock (dataset: "due in 19 h 12 m" at the end of the slice). Seeded drill, simulated clock. */
export const CRA_END = { at: '14:22:40', leftSec: 19 * 3600 + 12 * 60 };

/** Why a class sits at its tier, for the row tooltip. */
export const TIER_WHY = {
  quarantined: 'Fell 14:20:05 · tripwire, in GitLab',
  hands_off: 'Acts alone inside its envelope · revocable',
  bug: 'A person approves · record 9 / 15',
  other: 'A person approves the outcome',
};

/** Keys, behind the "?" in the status bar. */
export const KEYS: readonly (readonly [string, string])[] = [
  ['1–8', 'Cue a take'],
  ['R', 'Roll: 2 s pre-roll, play to out'],
  ['L', 'Loop the take'],
  ['I / O', 'Mark in / out at this seq'],
  ['Space', 'Play / pause'],
  ['← →', 'Step one ledger entry'],
  ['Home / End', 'First / last entry'],
  ['F', 'Present · Esc returns'],
  ['⌘I', 'Inspector'],
];
