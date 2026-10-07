// The two decisions whose write is a policy MR (n1 promote, n4 re-admit). Their commands and diff are never written
// here: they are the server's preview (previewAction), shown as it came. Until it comes, or when the server refuses,
// the outbox item says so and has nothing to run.
import { parseDiff } from '@/components/inspector/blocks/diff';
import { TIER_META } from '@/lib/tiers';
import { commandLines, type WriteView } from '@/server/actions/words';
import type { NeedsYouDemo } from '../../data/types';
import type { OutItem, PolicyKey } from '../types';

export const POLICY_KEYS: readonly PolicyKey[] = ['n1', 'n4'];
export const isPolicyKey = (key: string): key is PolicyKey => (POLICY_KEYS as readonly string[]).includes(key);

type Slice = Pick<NeedsYouDemo, 'promote' | 'readmit'>;

/** What the write does, in the operator's words: "Promote dep-bump.patch to Hands-off". */
export const policyTitle = (key: PolicyKey, demo: Slice): string =>
  key === 'n1' ? `Promote ${demo.promote.cls} to ${TIER_META[demo.promote.to].name}` : `Re-admit ${demo.readmit.cls} as Assisted`;

/** The line above a write's commands: what Run does with it, or why there is nothing to run. */
export function policyNote(view: WriteView | undefined): string {
  if (!view) return 'Asking Belay for the exact write…';
  if (view.kind === 'refused') return `Belay refuses this write: ${view.reason}. Nothing can run.`;
  return view.preview.mode === 'demo' ? 'Demo: Run simulates this write; nothing is sent to GitLab.' : view.preview.summary;
}

/** The outbox item of a policy-MR decision: the server's commands and diff, or none yet. */
export function policyItem(key: PolicyKey, demo: Slice, view: WriteView | undefined): OutItem {
  const base = { key, kind: 'policy MR', title: policyTitle(key, demo), ref: 'new MR · belay-policy', note: policyNote(view) };
  if (view?.kind !== 'preview') return { ...base, commands: [] };
  return { ...base, commands: commandLines(view.preview), file: 'belay-policy · tier-state.yml', diff: parseDiff(view.preview.diff) };
}
