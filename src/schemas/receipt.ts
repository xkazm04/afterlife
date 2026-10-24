// Where a tier record was enforced: the receipt the poller derives for a class one agent holds, from tier-state.yml's
// commit list on belay-policy and the tier_decision events of the ledger (src/server/poller/derive/receipt.ts). Plain
// data, client-safe: the Ladder's class page reads it as three facts (committed, read, withdrawn) and an alarm.
import type { WithdrawnGrant } from './chain/kinds';
import type { Tier } from './tier';

/** What belay-apply's sweep took back from a merge request (the ledger's `withdrew`, src/schemas/chain/kinds.ts). */
export type Withdrawn = WithdrawnGrant;

export interface ReceiptWithdrawal {
  what: Withdrawn;
  /** The merge request it was withdrawn from. */
  iid: number;
  /** The tier_decision's time (ISO). */
  at: string;
}

/** A gate that read the record's commit (or a later one) and still decided a tier above the record's. */
export interface ReceiptAlarm {
  iid: number;
  tier: Tier;
  at: string;
}

export interface EnforcementReceipt {
  /** The tier-state.yml commit that wrote the current record (40 hex), and when GitLab says it was made (ISO). */
  commit: string;
  committedAt: string;
  /**
   * The first gated merge request whose tier_decision states this commit or a later one of the list (`state_rev`): its
   * iid, the decision's time, and the seconds from the commit to it. All null while no gate has read it. A decision
   * stating a revision that is not in the list read is not counted, never guessed.
   */
  readIid: number | null;
  readAt: string | null;
  delaySec: number | null;
  /** Every withdrawal such a decision states, oldest first. */
  withdrew: ReceiptWithdrawal[];
  /** The first such decision at a tier above the record's (capped by the ceiling); null when there is none. */
  alarm: ReceiptAlarm | null;
}
