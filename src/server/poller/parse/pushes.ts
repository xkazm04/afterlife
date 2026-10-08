// Who pushed to a merge request's source branch, read from its notes. GitLab writes a system note for each push that adds
// commits to an open merge request, authored by the pusher: "added 1 commit" / "added 3 commits", then the commit list
// and a "Compare with previous version" link (SystemNotes::CommitService#add_commits; the notes API returns system notes
// with `system: true`, docs.gitlab.com/api/notes). [R?] the body's shape rests on GitLab's docs and source, not on a run:
// src/server/gitlab/__fixtures__/docs holds a system note ("added label") but no push note. So the recogniser fails
// closed: a push-related note it does not know leaves the fact unstated, never "unedited".
import type { GlNote } from '@/server/gitlab/types';

/** "added 1 commit", "added 12 commits": the one push note shape GitLab writes. A push that only drops commits writes none. */
const PUSH = /^added \d+ commits?\b/i;
/** A system note that mentions a commit or a push: the words any rewording of the push note would keep. */
const PUSH_RELATED = /\bcommit|\bpush/i;
/** A cross-reference ("mentioned in commit abc12345", SystemNotes::IssuablesService#cross_reference): not a push. */
const CROSS_REFERENCE = /^mentioned in\b/i;

export const isPushNote = (n: Pick<GlNote, 'system' | 'body'>): boolean => n.system && PUSH.test(n.body.trimStart());

/** A system note that looks like a push but is not in the shape this module recognises. */
const isUnrecognisedPush = (n: Pick<GlNote, 'system' | 'body'>): boolean => {
  const body = n.body.trimStart();
  return n.system && !PUSH.test(body) && !CROSS_REFERENCE.test(body) && PUSH_RELATED.test(body);
};

/**
 * Whether a commit reached the merge request from anyone but `author` (the agent that opened it) before it merged, read
 * from the notes at or before `mergedAt`. True: another account's push note. Null (no stated fact): another account's
 * system note that mentions a commit or a push in a shape not recognised, so a rewording by GitLab reads unknown, never
 * unedited. False otherwise. A person's rebase, a reviewer's applied suggestion and any push by another account are each
 * a push by that account, so each is an edit; the agent's own pushes, force pushes included, are not.
 */
export function editedBefore(notes: readonly GlNote[], author: string, mergedAt: string | null): boolean | null {
  const until = mergedAt ? Date.parse(mergedAt) : Number.POSITIVE_INFINITY;
  const others = notes.filter((n) => n.author !== author && !(Date.parse(n.createdAt) > until));
  if (others.some(isPushNote)) return true;
  return others.some(isUnrecognisedPush) ? null : false;
}
