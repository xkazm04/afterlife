// Typed fixtures for Needs you. The prototype's invented constants (DET, WEEK) live here as plain data.
import type { ClassRecord, MaturityProposal, TierKey } from '@/lib/demo/types';
import type { Tier } from '@/schemas/tier';

export type { DiffLine, DiffMark } from '@/components/inspector/blocks/diff';

/** The "The click" section: what the button does, and what it will not do. */
export interface ClickCopy {
  does: readonly string[];
  doesNot: readonly string[];
}

/** The slice of the shared demo dataset this screen reads. The server page builds it (data/pick.ts). */
export interface NeedsYouDemo {
  /** The project the decisions belong to: the id the server actions plan the writes for. */
  project: string;
  /** `cls`: the action class the promotion raises, to `to`. */
  promote: { title: string; cls: string; from: TierKey; to: Tier; rules: readonly (readonly [string, string, boolean])[]; record: ClassRecord };
  signoff: { title: string; linksResolved: string };
  /** `cls`: the quarantined action class a re-admission raises to Assisted. */
  readmit: { title: string; cls: string; reason: string };
  runner: { title: string };
  gaps: readonly MaturityProposal[];
  rungNames: readonly string[];
  incident: { title: string; reason: string; quote: string };
  record: ClassRecord;
  tierMeans: Record<TierKey, string>;
}

/** A row of "Decided this week": [when, kind, what, result, write]. */
export interface WeekRow {
  when: string;
  kind: string;
  what: string;
  result: string;
  ref: string;
}
