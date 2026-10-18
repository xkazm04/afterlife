// The Ladder's state and the actions that change it. The reducer is pure: time (an instant, `at`, epoch ms) and the
// commit id come in as data; the reducer labels the instant in the state's zone.
import type { LedgerSeedEntry } from '../../data/ledgerSeed';
import type { Sent } from './commit';
import type { Receipts } from './receipt';
import type { Ceiling, Change, ClassRow, Head, LadderSort, LedgerEntry, SortKey, Tier } from '../types';

export interface LadderState {
  classes: ClassRow[];
  ledger: LedgerEntry[];
  head: Head;
  /** How many simulated commits this session has made (picks the demo's next commit id). */
  shaIdx: number;
  sort: LadderSort;
  /** Class ids in display order, frozen until the sort changes. */
  order: string[];
  grouped: boolean;
  /** Collapsed track ids. */
  collapsed: string[];
  filt: Ceiling | null;
  src: string;
  q: string;
  /** Selection id: a class id, or "g:T1" for a group. */
  sel: string | null;
  /** The class whose revoke just landed (its row flashes once). */
  just: string | null;
  /** The screen's one zone (IANA), from the seed: every ledger label this session writes is in it. */
  tz: string;
}

/** A class as the route hands it: the data source's, with the promotion the poll opened for it (live). */
export type SeedClass = Omit<ClassRow, 'pending'>;

export interface LadderSeed {
  classes: readonly SeedClass[];
  ledger: readonly LedgerSeedEntry[];
  /** Quote of the guardrail's finding, by merge request ("!44"). */
  quotes: Readonly<Record<string, string>>;
  /** tier-state.yml's head when the screen opens. */
  head: Head;
  /** The zone the server labelled the ledger in (IANA; demo 'UTC'): the client labels its own entries in it too. */
  tz: string;
}

export type LadderAction =
  | { type: 'select'; id: string }
  | { type: 'sort'; key: SortKey }
  | { type: 'sortSet'; sort: LadderSort }
  | { type: 'grouped'; value: boolean }
  | { type: 'toggleGroup'; id: string; open?: boolean }
  | { type: 'collapseAll'; ids: readonly string[] }
  | { type: 'expandAll' }
  | { type: 'filter'; tier: Ceiling | null }
  | { type: 'source'; src: string }
  | { type: 'query'; q: string }
  /** The server answered done: `sent` says whether it was simulated, and the commit GitLab made if not. */
  /** `sha` (demo only): the simulated commit id the settle timer will name; without it the reducer takes the next one. */
  | { type: 'revoke'; id: string; to: Tier; at: number; sent: Sent; sha?: string }
  /** A whole track's write answered done: every change in one commit (`sha` as for revoke). */
  | { type: 'revokeTrack'; track: string; changes: readonly Change[]; at: number; sent: Sent; sha?: string }
  /** Demo: the simulated tier-gate read of commit `sha`, at `at`. */
  | { type: 'settle'; sha: string; at: number }
  /** Live: the receipts of a fresher snapshot, by class id. A pending revoke whose commit a gate read is settled. */
  | { type: 'receipts'; receipts: Receipts }
  | { type: 'clearFresh' }
  | { type: 'reset'; seed: LadderSeed };
