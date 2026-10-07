// The exact command a gap's write runs. Shown in the outbox and the inspector before anything is sent.
import type { MaturityProposal } from '@/lib/demo/types';
import { PROJECT_REPO } from '../../data/constants';
import { CRA } from '../../data/cra';
import { GAP_DETAIL } from '../../data/gaps';
import { RUNNER } from '../../data/runner';
import type { NeedsYouDemo } from '../../data/types';
import type { NeedsState } from '../types';
import { isPolicyKey } from './policy';

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** A gap with a branch opens one draft MR; a probe (no branch) opens an issue. */
export function gapCommand(g: MaturityProposal, rungNames: readonly string[]): string {
  const name = capital(g.stage);
  const branch = GAP_DETAIL.branch[g.id];
  if (!branch) return `glab issue create -R ${PROJECT_REPO} --title "${name}: ${g.title.toLowerCase()}" --label belay::gap`;
  const from = rungNames[g.from] ?? `R${g.from}`;
  const to = rungNames[g.to] ?? `R${g.to}`;
  return `glab mr create -R ${PROJECT_REPO} --draft --source-branch ${branch} --title "${name} R${g.from} → R${g.to} (${from} → ${to}): ${g.title}" --label belay::gap`;
}

/**
 * The exact commands behind a row's write, for "Copy Command". Null when the row writes nothing to copy, or (a policy MR)
 * when the server's plan is not on screen yet.
 */
export function commandsFor(id: string, demo: NeedsYouDemo, writes: NeedsState['writes'] = {}): readonly string[] | null {
  if (id === 'n2') return CRA.commands;
  if (isPolicyKey(id)) {
    const v = writes[id];
    return v?.kind === 'preview' ? v.preview.commands.map((c) => c.display) : null;
  }
  if (id === 'n5') return [RUNNER.command];
  const g = demo.gaps.find((x) => x.id === id);
  return g ? [gapCommand(g, demo.rungNames)] : null;
}
