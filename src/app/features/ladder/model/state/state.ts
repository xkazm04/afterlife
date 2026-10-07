// The Ladder's state and the actions that change it. The reducer is pure: time and the commit id come in as data.
import type { ActionClass } from '@/lib/demo';
import type { LedgerSeedEntry } from '../../data/ledgerSeed';
import type { Sent } from './commit';
import type { Ceiling, ClassRow, Head, LadderSort, LedgerEntry, SortKey, Tier } from '../types';

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
}

export interface LadderSeed {
  classes: readonly ActionClass[];
  ledger: readonly LedgerSeedEntry[];
  /** Quote of the guardrail's finding, by merge request ("!44"). */
  quotes: Readonly<Record<string, string>>;
  /** tier-state.yml's head when the screen opens. */
  head: Head;
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
  | { type: 'revoke'; id: string; to: Tier; t: string; sent: Sent }
  | { type: 'settle'; sha: string; t: string }
  | { type: 'clearFresh' }
  | { type: 'reset'; seed: LadderSeed };
