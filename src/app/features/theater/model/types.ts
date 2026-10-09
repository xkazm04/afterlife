// Types for a film (the illustrative slice, or one read from belay-ledger) and the things derived from it. Plain shapes.
// Client code imports only types from @/schemas/ledger (that module imports node:crypto).
import type { Ceiling, Stage } from '@/schemas';
import type { GuardrailVerdict, LedgerKind } from '@/schemas/ledger';

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

/** What one belay-ledger event states, as a real film's entry carries it. Nothing else. */
export interface LedgerFacts {
  /** ISO-8601, the event's own */
  at: string;
  kind: LedgerKind;
  actionClass: string;
  tier: Ceiling;
  verdict?: GuardrailVerdict;
  /** The MR's iid. */
  iid: number;
  /** The event hash's first 12 hex digits. */
  hash: string;
}

/** One film entry: a line of the illustrative slice, or (with `ev`) one belay-ledger event. */
export interface LedgerEntry {
  seq: number;
  /** hh:mm:ss */
  t: string;
  /** An Actor on the illustrative slice; the event's agent on a real one. */
  by: string;
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
  /** A real film's entry: what its ledger event states. */
  ev?: LedgerFacts;
}

/** A take: the storyboard cut into re-shootable pieces of the slice, by seq. On a real film, one MR. */
export interface Take {
  name: string;
  a: number;
  b: number;
  seeded?: boolean;
  /** A real film's take: the MR it plays. */
  mr?: number;
}

/** In / out points as seqs. */
export interface Marks {
  a: number;
  b: number;
}

/** One of the nine holds of the loop. `who` and `text` are the illustrative film's narrative only. */
export interface Hold {
  n: number;
  label: string;
  stage: string;
  who?: string;
  text?: string;
}

/**
 * What the screen plays. `illustrative`: the invented slice (data/ledger.ts), its takes and the catalogue's loop.
 * `belay-ledger`: the deep project's own events, one take per MR, each MR's entries contiguous and folded from empty.
 */
export interface Film {
  source: 'illustrative' | 'belay-ledger';
  entries: readonly LedgerEntry[];
  takes: readonly Take[];
  holds: readonly Hold[];
}

/** The catalogue parts the illustrative film shows around the climb (read from lib/demo). A real film has none. */
export interface TheaterDemo {
  stages: readonly Stage[];
  tracksArmed: number;
  tracksTotal: number;
  rungNames: readonly string[];
  rungs: readonly { stage: string; evidence: string; day0: number | null }[];
  /** The untrusted line quoted from !44. */
  quote: string;
}

/** What the server page hands the client screen. `demo` is null on a real film. */
export interface TheaterData {
  film: Film;
  demo: TheaterDemo | null;
  /** group / project the film is about */
  subtitle: string;
}
