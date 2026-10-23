// The live desk's view-model: what NeedsYouLive draws, built from the live inbox and the decided list. Pure types.
import type { ApplyGapTemplate, PromoteClass } from '@/server/actions/types';
import type { DecidedItem } from '@/server/data/types';
import type { NeedsYouItem } from '@/lib/demo/types';

export type DeskIntent = PromoteClass | ApplyGapTemplate;
/** 'other': an inbox kind this desk only reads (a sign-off, a setup step); its source's kind says which. */
export type DeskKind = 'promote' | 'readmit' | 'gap' | 'other' | 'decided';
export type Deadline = 'none' | 'overdue' | 'today' | 'later';
export type Grouping = 'kind' | 'project' | 'deadline';

export interface DeskItem {
  id: string;
  kind: DeskKind;
  project: string;
  title: string;
  /** When it started waiting (ISO); null when unknown. */
  openedAt: string | null;
  /** Decided items only (ISO and the operator); null otherwise. */
  actedAt: string | null;
  actedAs: string | null;
  group: { kind: DeskKind; project: string; deadline: Deadline };
  /** The write the row's click previews; null when the row cannot write here. */
  intent: DeskIntent | null;
  /** Why the row is read-only here; null when it has an intent or is decided. */
  readOnly: string | null;
  /** The inbox item it came from; null for a decided row. */
  source: NeedsYouItem | null;
  decided: DecidedItem | null;
}

export interface DeskGroup {
  id: string;
  name: string;
  items: readonly DeskItem[];
}

export interface DeskSummary {
  count: number;
  projects: number;
  /** ISO; null when no open item has a known start. */
  oldestOpenedAt: string | null;
}

export type OutState = 'staged' | 'running' | 'done' | 'refused' | 'failed';

export interface DeskOut {
  /** Staged ids, in staging order: Run all confirms them in this order. */
  order: readonly string[];
  result: Readonly<Record<string, { state: OutState; text: string | null }>>;
  running: boolean;
}

export type DeskOutAction =
  | { type: 'stage'; id: string }
  | { type: 'unstage'; id: string }
  | { type: 'start' }
  | { type: 'result'; id: string; state: Exclude<OutState, 'staged'>; text: string | null }
  | { type: 'finish' };
