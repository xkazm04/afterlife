// Types for the recorded ledger slice and the things derived from it. Plain shapes, no logic.
import type { Ceiling, Stage } from '@/schemas';

export type Actor = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8' | 'scanner' | 'engine' | 'deploy' | 'belay';

/** The scene an entry belongs to: a beat number 1..9, the seeded !44 line, or the closing board. */
export type Scene = number | 'm44' | 'board';

export type CheckId = 'base-red' | 'head-green' | 'not-weakened' | 'envelope' | 'rescan';

export interface NeedItem {
  k: 'gaps' | 'signoff' | 'readmit';
  label: string;
  /** hh:mm:ss */
  since: string;
}

/** One recorded ledger entry (illustrative; the demo dataset has no ledger of its own). */
export interface LedgerEntry {
  seq: number;
  /** hh:mm:ss */
  t: string;
  by: Actor;
  x: string;
  sc: Scene;
  /** Dwell in ms when played. Default 2600. */
  d?: number;
  /** This entry moves the climb to this beat. */
  beat?: number;
  now?: string;
  rung?: readonly (readonly [Stage, number])[];
  check?: CheckId;
  pass?: number;
  fail?: number;
  dem?: number;
  seeded?: boolean;
  /** The !44 untrusted quote is shown with this entry. */
  quote?: boolean;
  tier?: { cls: string; to: Ceiling };
  need?: NeedItem;
  /** From here on the pitch shows the nine-stage wall. */
  board?: boolean;
}

/** A take: the storyboard cut into re-shootable pieces of the slice, by seq. */
export interface Take {
  name: string;
  a: number;
  b: number;
  seeded?: boolean;
}

/** In / out points as seqs. */
export interface Marks {
  a: number;
  b: number;
}

/** What the server page hands the client screen (read from lib/demo). */
export interface TheaterDemo {
  stages: readonly Stage[];
  tracksArmed: number;
  tracksTotal: number;
  loop: readonly { n: number; label: string; stage: string; who: string; text: string }[];
  rungNames: readonly string[];
  rungs: readonly { stage: string; evidence: string; day0: number | null }[];
  /** The untrusted line quoted from !44. */
  quote: string;
}
