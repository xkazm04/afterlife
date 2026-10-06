// Typed fixtures for Needs you. The prototype's invented constants (DET, WEEK) live here as plain data.
import type { DiffLine } from '@/components/inspector/blocks/diff';
import type { ClassRecord, MaturityProposal, TierKey } from '@/lib/demo/types';

export type { DiffLine, DiffMark } from '@/components/inspector/blocks/diff';

/** The "The click" section: what the button does, and what it will not do. */
export interface ClickCopy {
  does: readonly string[];
  doesNot: readonly string[];
}

/** One staged write: the exact commands, the file it changes, the diff and the line shown after Run. */
export interface WriteSpec {
  ref: string;
  commands: readonly string[];
  file: string;
  diff: readonly DiffLine[];
  result: string;
}

/** The slice of the shared demo dataset this screen reads. The server page builds it (data/pick.ts). */
export interface NeedsYouDemo {
  promote: { title: string; from: TierKey; to: TierKey; rules: readonly (readonly [string, string, boolean])[] };
  signoff: { title: string; linksResolved: string };
  readmit: { title: string; reason: string };
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
