// Who pushed to a merge request's source branch, read from its notes. GitLab writes a system note for each push that adds
// commits to an open merge request, authored by the pusher: "added 1 commit" / "added 3 commits", then the commit list
// and a "Compare with previous version" link (SystemNotes::CommitService#add_commits; the notes API returns system notes
// with `system: true`, docs.gitlab.com/api/notes). [R?] the body's shape rests on GitLab's docs and source, not on a run:
// src/server/gitlab/__fixtures__/docs holds a system note ("added label") but no push note.
import type { GlNote } from '@/server/gitlab/types';

/** "added 1 commit", "added 12 commits"; a "force-pushed" note too, should GitLab write one: either is a push. */
const PUSH = /^(added \d+ commits?\b|force[- ]pushed\b)/i;

export const isPushNote = (n: Pick<GlNote, 'system' | 'body'>): boolean => n.system && PUSH.test(n.body.trimStart());

/**
 * Whether a commit reached the merge request from anyone but `author` (the agent that opened it) before it merged: a push
 * note by another account at or before `mergedAt`. A person's rebase, a reviewer's applied suggestion and any push by
 * another account are each a push by that account, so each is an edit; the agent's own pushes, force pushes included,
 * are not.
 */
export function editedBefore(notes: readonly GlNote[], author: string, mergedAt: string | null): boolean {
  const until = mergedAt ? Date.parse(mergedAt) : Number.POSITIVE_INFINITY;
  return notes.some((n) => isPushNote(n) && n.author !== author && !(Date.parse(n.createdAt) > until));
}
