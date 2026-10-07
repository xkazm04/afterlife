// Live Needs you: what each item the poll found can do from this list. A promotion or a re-admit is one policy MR through
// the server actions (write/promote.ts), the door the desk uses: the exact write is the server's preview, and Run confirms
// that preview by its id. Every other kind is read-only here and says where to act today. Pure.
import type { NeedsYouItem } from '@/lib/demo';
import { TIER_META } from '@/lib/tiers';
import { TIER_ORDER } from '@/schemas/tier';
import type { PromoteClass } from '@/server/actions/types';
import type { Outcome } from '@/server/actions/words';

/** The action class an inbox title names after its last " · " ("Promote T1 patcher · dep-bump.patch"). */
export const classOfTitle = (title: string): string | null => title.split(' · ').at(-1)?.trim() || null;

/** The write a live item sends, or null when it sends none from here. A re-admit is a promote-class to Assisted, never higher. */
export function liveIntent(item: Pick<NeedsYouItem, 'id' | 'kind' | 'title' | 'to'>, project: string): PromoteClass | null {
  const cls = item.kind === 'promote' || item.kind === 'readmit' ? classOfTitle(item.title) : null;
  if (!cls) return null;
  if (item.kind === 'readmit') return { kind: 'promote-class', project, class: cls, to: 'assisted', proposal: item.id };
  const to = TIER_ORDER.find((t) => t === item.to);
  return to ? { kind: 'promote-class', project, class: cls, to, proposal: item.id } : null;
}

/** The button: "Open the promotion MR" / "Open the re-admit MR". */
export const runLabel = (kind: string): string => (kind === 'readmit' ? 'Run · open the re-admit MR' : 'Run · open the promotion MR');

/** The write, as an answer names it: "code-fix.patch → Supervised". */
export const writeName = (intent: PromoteClass): string => `${intent.class} → ${TIER_META[intent.to].name}`;

const ELSEWHERE: Readonly<Record<string, string>> = {
  signoff: 'Read-only here: sign off on the CRA clock work item in GitLab. This list does not send the sign-off yet.',
  gaps: 'Read-only here: pick and open the gap merge requests in GitLab. This list does not send them yet.',
  setup: 'Read-only here: finish this step in Setup or in GitLab.',
};

/** Where to act on an item this list sends nothing for. */
export const elsewhere = (kind: string): string => ELSEWHERE[kind] ?? 'Read-only here: act on it in GitLab.';

/** What the list holds of a sent write's answer: only what the response said. */
export interface LiveAnswer {
  status: Outcome['status'];
  text: string;
}

/** The answer when the confirm got no response at all. */
export const noAnswer = (text: string): LiveAnswer => ({ status: 'failed', text });
