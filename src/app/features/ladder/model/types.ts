// Shared types of the Ladder model. Plain data, no logic.
import type { ActionClass, RecordCounters, Track } from '@/lib/demo';
import type { SortState } from '@/components/table/model/sort';
import type { Ceiling, Tier } from '@/schemas';

export type { Ceiling, Tier, Track };

/** A record's counters, each on its own: null is a counter no task or ledger event states (never zero). */
export type Counters = RecordCounters;

/**
 * The promotion the last poll opened in Needs you for a class (live): the poll counted its record and Ladder's own rule
 * (rules/promotion.ts) found it eligible, from `from` to `to`. `rules`: [rule, value, met], as the ask carries them.
 */
export interface PromotionAsk {
  id: string;
  from: Tier;
  to: Tier;
  rules: readonly (readonly [string, string, boolean])[];
}

/**
 * An action class as the table holds it: the demo class plus the "commit pushed, tier-gate not read yet" marker. A
 * record may know some counters only (each unknown one null); `ask` is set live when the poll opened a promotion.
 */
export interface ClassRow extends Omit<ActionClass, 'record'> {
  record: Counters | null;
  ask?: PromotionAsk;
  pending: string | null;
}

/** Who made a move: a GitLab job, you (on your key), a person (policy MR), or Belay noticing on a poll. */
export type ActorKind = 'gitlab' | 'you' | 'person' | 'belay';

export interface LedgerEntry {
  /** "14:20:03" for a timed event, "11 d ago" for an old one. */
  t: string;
  ids: string[];
  actor: string;
  where: string;
  kind: ActorKind;
  /** Honesty chip drawn beside the actor. */
  chip?: 'seeded' | 'simulated';
  text: string;
  /** Untrusted text quoted by the guardrail. */
  quote?: string;
  /** "+12 s late": Belay noticing after the fact. */
  lag?: string;
  /** Appended just now: plays the highlight once. */
  isNew?: boolean;
  /** The demo's own history shown beside live data (live mode): it carries a demo mark. */
  demo?: boolean;
}

export type SortKey = 'move' | 'name' | 'track' | 'tier' | 'ceiling' | 'lease' | 'acc' | 'noedit' | 'rv' | 'clean';
export type LadderSort = SortState<SortKey>;

export interface Head {
  sha: string;
  by: string;
  /** The demo's head, not read from belay-policy (live mode, until a revoke here names a real commit): marked demo. */
  demo?: boolean;
}

export type TrackMap = Readonly<Record<string, Track>>;

/** A change to commit: take class `id` down to tier `to`. */
export interface Change {
  id: string;
  to: Tier;
}
