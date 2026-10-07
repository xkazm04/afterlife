// The outbox item of a gap: the server's commands and diff for its MR, or none yet. Never written here. A gap the server
// has no door for (the probe, a gap with no proposal files) stages nothing.
import { parseDiff } from '@/components/inspector/blocks/diff';
import type { MaturityProposal } from '@/lib/demo/types';
import { commandLines, type WriteView } from '@/server/actions/words';
import type { NeedsYouDemo } from '../../data/types';
import type { OutItem } from '../types';
import { policyNote } from './policy';

export function gapItem(g: MaturityProposal, demo: Pick<NeedsYouDemo, 'project'>, view: WriteView | undefined): OutItem {
  const base = { key: g.id, kind: 'gap MR', title: `${g.stage}: ${g.title}`, ref: `new draft MR · ${demo.project}`, note: policyNote(view) };
  if (view?.kind !== 'preview') return { ...base, commands: [] };
  return { ...base, commands: commandLines(view.preview), file: `gap ${g.id}`, diff: parseDiff(view.preview.diff) };
}
