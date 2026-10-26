// A promotion's (or a re-admission's) round trip with the server, from the Ladder. It is the same promote-class intent
// Needs you sends (needs-you/write/promote.ts), so the same round trip: previewAction when the class is eligible and in
// view (the server plans the branch commit and the MR from belay-policy as it is; nothing runs), confirmAction with that
// preview's id on p or the click. A person merges the MR in GitLab; Afterlife never does. The screen never spells a command.
import { askPolicyMr, sendPolicyMr } from '@/app/features/needs-you/write/promote';
import type { ActionResponse, PromoteClass } from '@/server/actions/types';
import type { WriteView } from '@/server/actions/words';
import type { Tier } from '../model/types';

/**
 * What the screen holds for one promotion: the server's preview (or why there is none), or, once the server answered
 * done, the MR it opened (`mr` "!22" and its `url`, from GitLab's own answer) or that the demo only simulated it.
 */
export type PromoteView = WriteView | { kind: 'sent'; mr: string | null; url: string | null; simulated: boolean };

/**
 * `proposal`: the Needs-you ask this settles, only when a live one is open for the class. Without one the MR is still
 * opened (a settled or missing ask is not a refusal), and nothing in the inbox is closed.
 */
export const promoteIntent = (project: string, id: string, to: Tier, proposal?: string): PromoteClass => ({
  kind: 'promote-class',
  project,
  class: id,
  to,
  ...(proposal ? { proposal } : {}),
});

/** The promotion is in view: ask for its exact write. Never sends anything. */
export function askPromote(intent: PromoteClass): Promise<WriteView> {
  return askPolicyMr(intent);
}

/**
 * p or the click: confirm the write on screen, by its preview id. Without a preview on screen (still asked, refused, or
 * already sent) nothing is sent and the answer is null. It rejects when the server does not answer (NO_ANSWER).
 */
export async function sendPromote(intent: PromoteClass, view: PromoteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return sendPolicyMr(intent, view);
}
