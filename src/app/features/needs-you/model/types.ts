// State of the Needs you screen. Pure data: the reducer in reducer.ts is the only thing that changes it.
import type { ActionResponse } from '@/server/actions/types';
import type { WriteView } from '@/server/actions/words';
import type { DiffLine, WeekRow } from '../data/types';

export type GroupMode = 'kind' | 'project' | 'deadline';
export type ShowFilter = 'all' | 'waiting' | 'outbox' | 'sent';
/** The four decisions that are not gaps. n3 ("pick the gaps") is shown as one row per gap, g1..g4. */
export type DecisionKey = 'n1' | 'n2' | 'n4' | 'n5';
export type DecisionStatus = 'open' | 'staged' | 'sent' | 'snoozed' | 'merged' | 'retired' | 'done';
export type GapStatus = 'staged' | 'sent';
/** The decisions whose write is a policy MR, planned and run by the server (previewAction, then confirmAction). */
export type PolicyKey = 'n1' | 'n4';

export type ActionId =
  | 'read-draft'
  | 'read-note'
  | 'stage-n2'
  | 'stage-n1'
  | 'stage-n4'
  | 'stage-gaps'
  | 'snooze-n1'
  | 'unsnooze-n1'
  | 'merge-n1'
  | 'retire-n4'
  | 'open-runner'
  | 'check-runner'
  | 'submitted'
  | 'out-on'
  | 'out-off'
  | 'out-toggle'
  | `stage-gap:${string}`
  | `tick:${string}`
  | `unstage:${string}`;

/** One staged write waiting for Run. */
export interface OutItem {
  key: string;
  kind: string;
  title: string;
  ref: string;
  commands: readonly string[];
  /** The legal clock's write goes first in line. */
  clock?: boolean;
  file?: string;
  diff?: readonly DiffLine[];
  /** Shown above the commands: whether Run simulates (demo) or runs as you, that the write is still being asked for, or why there is none. */
  note?: string;
}

/** A row of "Decided this week". `fresh` marks one decided in this session. */
export interface HistRow extends WeekRow {
  fresh?: boolean;
}

/** A message for the toast or the status bar. `id` changes with every notice so the screen can react once. */
export interface Notice {
  id: number;
  channel: 'status' | 'toast';
  text: string;
}

export interface NeedsState {
  group: GroupMode;
  show: ShowFilter;
  query: string;
  /** Selected row id, or "g:<group>" for a group row. */
  sel: string;
  collapsed: readonly string[];
  /** Inspector sections the viewer opened or closed; unset means the section's default. */
  sections: Readonly<Record<string, boolean>>;
  /** Outbox drawer visible. */
  outboxOpen: boolean;
  /** Outbox items the viewer collapsed. */
  itemsShut: readonly string[];
  status: Readonly<Record<DecisionKey, DecisionStatus>>;
  read: { draft: boolean; note: boolean };
  /** Gap ticks (picked). */
  gaps: Readonly<Record<string, boolean>>;
  gapStatus: Readonly<Record<string, GapStatus>>;
  out: readonly OutItem[];
  sent: readonly string[];
  session: readonly HistRow[];
  runner: { opened: boolean; check: null | 'none' | 'ok' };
  submitted: boolean;
  /** The exact write of each decision the server plans (a policy MR, a gap MR), as it planned it. Absent while it is being asked for. */
  writes: Readonly<Partial<Record<string, WriteView>>>;
  notice: Notice | null;
  /** Set when an action wants the inspector open on a section: the screen reveals it once per id. */
  reveal: { id: number; key: string } | null;
}

export type Action =
  | { type: 'act'; action: ActionId }
  | { type: 'run'; key: string }
  /** The server planned (or refused) a decision's write: a policy MR (n1, n4) or a gap MR (g1..). */
  | { type: 'write'; key: string; view: WriteView }
  /** The server answered Run on such a decision. */
  | { type: 'ran'; key: string; response: ActionResponse }
  | { type: 'remove'; key: string }
  | { type: 'select'; id: string }
  | { type: 'group'; mode: GroupMode }
  | { type: 'show'; show: ShowFilter }
  | { type: 'query'; query: string }
  | { type: 'toggleGroup'; id: string; open?: boolean }
  | { type: 'expandAll' }
  | { type: 'section'; key: string; open: boolean }
  | { type: 'itemShut'; key: string }
  | { type: 'openHistory' };
