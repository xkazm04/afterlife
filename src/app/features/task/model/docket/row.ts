// A docket row: what the sidebar, the verdict filters, the class menu and n need of every task, and nothing more (no
// chain, no proof checks, no ledger). The screen stream sends the docket as these rows; the open task comes whole in its
// own slice. Pure.
import type { Selection } from '../court/selection';
import type { TaskView, Verdict } from '../types';
import { openingSelection } from '../verdict/reasons';
import { derivedVerdict } from '../verdict/verdict';

export interface DocketRow {
  id: string;
  title: string;
  track: string;
  /** The task's merge request; absent when it has none. */
  mr?: string;
  /** The proof class. */
  cls: string;
  /** What the checks say (derivedVerdict): the word every filter and glyph uses. */
  verdict: Verdict;
  /** What the proof stored. */
  stored: Verdict;
  mismatch: boolean;
  /** The first chain link's time; absent when the task holds no receipt chain. */
  firstAt?: string;
  /** The task's first deciding check (what n opens on); absent when it has none (a PASS, an UNKNOWN). */
  opening?: NonNullable<Selection>;
}

export function docketRow(t: TaskView): DocketRow {
  const v = derivedVerdict(t);
  const first = t.chain[0]?.at;
  const opening = openingSelection(t);
  return {
    id: t.id,
    title: t.title,
    track: t.track,
    ...(t.mr ? { mr: t.mr } : {}),
    cls: t.proof.cls,
    verdict: v.verdict,
    stored: v.stored,
    mismatch: v.mismatch,
    ...(first ? { firstAt: first } : {}),
    ...(opening ? { opening } : {}),
  };
}
