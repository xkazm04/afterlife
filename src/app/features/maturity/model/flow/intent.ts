// The server intent for "Send as you": one draft MR per picked gap, built from the gap's own files. Pure.
import type { StageGapMr } from '@/server/actions/types';
import type { DiffFile } from '../../data/types';
import type { Gap } from '../ctx';
import { MAT_META } from '../../data/meta';

/**
 * A file's content after the change: added and context lines, without their diff marker; removed lines dropped. The
 * server refuses an update that would drop a line of the file on the branch, so a partial hunk can never overwrite it.
 */
export function contentOf(file: DiffFile): string {
  return file.lines
    .filter((l) => !l.startsWith('-'))
    .map((l) => l.slice(1))
    .join('\n')
    .concat('\n');
}

/** The intent for one gap, or null for a probe (a probe is read-only: it opens no MR). */
export function gapIntent(gap: Gap, project = 'ledgerline'): StageGapMr | null {
  if (gap.x.kind !== 'mr' || !gap.x.branch || !gap.x.files.length) return null;
  const workItem = Number(gap.x.workItem.replace(/^#/, ''));
  return {
    kind: 'stage-gap-mr',
    project,
    gap: gap.id,
    stage: gap.stage,
    from: gap.from,
    to: gap.to,
    title: gap.title,
    branch: gap.x.branch,
    files: gap.x.files.map((f) => ({ path: f.path, content: contentOf(f) })),
    ...(Number.isFinite(workItem) && workItem > 0 ? { workItem } : {}),
  };
}

/** Where the MRs go, for the sheet's subtitle. */
export const GAP_REPO = MAT_META.project;
