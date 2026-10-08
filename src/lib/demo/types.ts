// Types for the illustrative demo fixture (data/belay-demo.json). The JSON is plain data; these types describe
// it once so every screen reads it typed. A test (demo.test.ts) checks the fixture against them.
import type { Ceiling, Stage } from '@/schemas';
import type { ClassCell } from '@/lib/tiers';
import type { NeedsYouItem, SetupPhase, Task } from './deepTypes';

export type * from './deepTypes';

/** A tier key as the fixture spells it (hands_off, supervised, assisted, quarantined, human_only). */
export type TierKey = Ceiling;
export type ProjectState = 'watching' | 'setting-up' | 'stale' | 'not-set-up';
export type TierCounts = Record<TierKey, number>;

export interface ProofCounts {
  pass: number;
  fail: number;
  inconclusive: number;
}

export interface FeedStatus {
  /** null: never polled. */
  ageSec: number | null;
  /** null: unknown. */
  ok: boolean | null;
  error?: string;
}

export interface LastEvent {
  at: string;
  track: string;
  text: string;
}

export interface Project {
  id: string;
  name: string;
  what: string;
  state: ProjectState;
  armed: number;
  tiers: TierCounts;
  /** null: unknown, never zero. */
  proofs7d: ProofCounts | null;
  demotions7d: number | null;
  needsYou: number;
  /** Nine rungs 0..4, null = unknown. */
  stages: (number | null)[];
  feed: FeedStatus;
  env?: { staging: string; production: string };
  craOpen: number;
  last?: LastEvent | null;
}

export interface FleetProject extends Project {
  group: string;
  /** Each class: its tier, 'no_record' / 'refused' when the gate grants none, null when unknown. */
  classTiers: Record<string, ClassCell>;
  setupStep?: string;
}

export interface TierInfo {
  label: string;
  means: string;
}

export interface Track {
  id: string;
  key: string;
  name: string;
  verb: string;
  stages: Stage[];
  armed: boolean;
  armedBy: string;
  classes: string[];
  latest: { text: string; at: string };
  proof: { cls: string; status: string };
  needs: string | null;
}

export interface ClassRecord {
  accepted: number;
  needed: number | null;
  noEdit: number;
  cleanDays: number;
  reverts: number;
}

/**
 * A record as the index states it: each counter on its own, null where no task or ledger event states it (never zero).
 * The fixture's records are ClassRecords, every counter set; a polled record may know some counters only.
 */
export type RecordCounters = { [K in keyof ClassRecord]: ClassRecord[K] | null };

export interface ActionClass {
  id: string;
  track: string;
  ceiling: TierKey;
  tier: TierKey;
  lease_days: number | null;
  record: RecordCounters | null;
  lastMove: string;
}

export interface MaturityRung {
  stage: Stage;
  day0: number;
  now: number;
  next: number;
  evidence: string;
}

export interface MaturityProposal {
  id: string;
  stage: Stage;
  from: number;
  to: number;
  title: string;
  picked: boolean;
  diffLines: number;
}

export interface LoopStep {
  n: number;
  key: string;
  label: string;
  stage: Stage;
  who: string;
  text: string;
}

export interface DemoData {
  _note: string;
  product: { name: string; claim: string; sub: string };
  portfolio: { group: string; projectsWatched: number; asOf: string; projects: Project[] };
  fleet: { classes: string[]; groups: string[]; projects: FleetProject[] };
  stages: Stage[];
  tracks: Track[];
  actionClasses: ActionClass[];
  tiers: Record<TierKey, TierInfo>;
  maturity: { engine: string; scannedAt: string; rungNames: string[]; rungs: MaturityRung[]; proposals: MaturityProposal[] };
  loop: LoopStep[];
  tasks: Task[];
  needsYou: NeedsYouItem[];
  setup: {
    group: string;
    project: string;
    doctor: { available: number; unavailable: number; unknown: number; rows: [string, string][] };
    phases: SetupPhase[];
    arm: [string, string, string | null][];
    nextWrite: string;
  };
  /** [time, track, text] */
  events: [string, string, string][];
  cockpit: {
    running: string;
    doingNow: string;
    goingWell: string;
    needsMe: string;
    feed: { lastPollSec: number; webhooks: string; errors: number };
    unattributed: number;
  };
}
