// Shared types of the Ladder model. Plain data, no logic.
import type { ActionClass, Track } from '@/lib/demo';
import type { Counters, PromotionAsk } from '@/lib/promotion';
import type { SortState } from '@/components/table/model/sort';
import type { Ceiling, EnforcementReceipt, Tier } from '@/schemas';

export type { Ceiling, Counters, EnforcementReceipt, PromotionAsk, Tier, Track };

/**
 * An action class as the table holds it: the demo class plus the "commit pushed, tier-gate not read yet" marker. A
 * record may know some counters only (each unknown one null); `ask` is set live when the poll opened a promotion.
 */
export interface ClassRow extends Omit<ActionClass, 'record'> {
  record: Counters | null;
  ask?: PromotionAsk;
  /** Live: the record is not the poll's count (a class several agents or no agent holds): the one the index held. */
  uncounted?: true;
  /** Live: tier-state.yml's cooldown_until on the record (ISO): the promotion rule's cooldown row reads it. */
  cooldownUntil?: string;
  /** Live: where the record was enforced, as the last poll derived it (src/schemas/receipt.ts). Absent: none derived. */
  receipt?: EnforcementReceipt;
  /** Demo: the simulated tier-gate read that settled this session's revoke (its commit id and clock label). */
  simRead?: { sha: string; t: string };
  pending: string | null;
}

/** Who made a move: a GitLab job, you (on your key), a person (policy MR), or Belay noticing on a poll. */
export type ActorKind = 'gitlab' | 'you' | 'person' | 'belay';

export interface LedgerEntry {
  /** When it happened (epoch ms): the ground truth. The rail orders and scales by it. */
  at: number;
  /**
   * Its label, derived once from `at` in the screen's zone (model/clock.ts clockLabel, the zone in LadderState.tz):
   * "14:20:03" within a day of when it was written, "11 d ago" for an older one. Display only, never parsed back.
   */
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
  /** Live: the Theater filming this move's MR first (`/theater?mr=<iid>`). The demo's moves have no run to replay. */
  replay?: string;
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
