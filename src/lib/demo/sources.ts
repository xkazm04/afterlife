// The outputs behind a record's counts: which merge requests the poll counted, which it left out and why, and which facts
// it could not read. The poll derives it from the same selected outputs it totals (server/poller/derive/sources.ts), so a
// count and its list can never disagree. Plain types and the cap; no logic.
import type { Tier, TrialResolution } from '@/schemas';

/** An output's stated outcome: merged and reverted from a task row or a ledger merge, closed and blocked from a task row. */
export type OutputOutcome = 'merged' | 'reverted' | 'closed' | 'blocked';

/** One output of the holder in the class since the record's since: a merge request with a stated outcome. */
export interface CountedOutput {
  iid: number;
  outcome: OutputOutcome;
  /** The latest time stated for its outcome (ISO). */
  at: string;
  /** Counted: among the window's last outputs (every output is, without a window). */
  inWindow: boolean;
  /** A merged output: someone but the holder pushed to it before it merged. Null: no task row states it, or not merged. */
  edited: boolean | null;
  /** A merged output: a tier_decision for it in the imported ledger. Null: the ledger was not read, or not merged. */
  gated: boolean | null;
}

/**
 * A fact the counts could not read. Per MR: `edit`, a counted merge with no task row stating whether anyone else pushed to
 * it (merged without edits is then null); `tier_decision`, a counted merge belay-apply's gate did not decide (the gated
 * outputs fall short of it); `verdict`, a guardrail verdict event that states neither pass nor block. For the record
 * (`iid` null): `ledger`, this poll did not read belay-ledger (gated outputs and guardrail blocks are null);
 * `revert_policy`, trust-policy.yml does not demote on a revert (reverts and clean days are null).
 */
export type MissingFact = 'edit' | 'tier_decision' | 'verdict' | 'ledger' | 'revert_policy';

export interface RecordSources {
  /** The record's since the counts start at (ISO). */
  since: string;
  /** The holder's last this many outputs are counted; null: every output since `since`. */
  window: number | null;
  /** The project's GitLab web URL: an output links to <web>/-/merge_requests/<iid>. Null: not known (a plain !iid). */
  web: string | null;
  /** The outputs since `since`, newest first, at most SOURCES_CAP of them. */
  outputs: CountedOutput[];
  /** Every output since `since`: more than `outputs` lists when the list is capped. */
  total: number;
  /** Listed outputs the counts leave out, and why: outside the window's last outputs. */
  excluded: { iid: number; reason: 'outside_window' }[];
  /** The merge requests counted as guardrail blocks (an output, or one with a verdict that is no output yet). */
  blocks: number[];
  missing: { iid: number | null; fact: MissingFact }[];
  /**
   * The next rung's trial merge requests (src/schemas/trial.ts), newest decision first, at most SOURCES_CAP: each with
   * how it resolved. Absent: none listed (the ledger was not read, or a record listed before the trial was).
   */
  trial?: TrialSource[];
  /** The demo fixture's: illustrative (the demo has no ledger), marked demo wherever it is shown. */
  demo?: true;
}

/** A trial merge request: the tier its tier_decision's `would` acted alone at, when that decision was made (ISO), and how it resolved. */
export interface TrialSource {
  iid: number;
  tier: Tier;
  at: string;
  resolution: TrialResolution;
}

/** The most outputs (and missing facts, and blocks) a record's sources list: the newest. */
export const SOURCES_CAP = 50;
