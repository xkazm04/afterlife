// F38 part 2: an arm or disarm confirm is done only when the MR GitLab opened is headed by the commit this confirm made.
// Anything else means someone pushed to the branch between the commit and the MR, and the MR (authored by the operator,
// "Prepared by Belay") would carry a commit nobody previewed. Only these two intents are checked; every other write
// keeps its behaviour.
import type { GitLabPort, ProjectRef } from '@/server/gitlab/port';
import { COMMIT_ID } from '../plans/context';
import type { ActionIntent } from '../types';

export const headChecked = (kind: ActionIntent['kind']): boolean => kind === 'arm-track' || kind === 'disarm-track';

const asRec = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});

/** The MR's head commit as GitLab names it: diff_refs.head_sha, else sha. Null when neither is a commit id. */
function headIn(body: unknown): string | null {
  const b = asRec(body);
  const id = [asRec(b.diff_refs).head_sha, b.sha].find((x): x is string => typeof x === 'string' && COMMIT_ID.test(x));
  return id ?? null;
}

/** From the create answer, else one read of the MR (GitLab may fill its diff after answering). */
async function mrHead(port: GitLabPort, project: ProjectRef, body: unknown): Promise<string | null> {
  const head = headIn(body);
  if (head) return head;
  const iid = asRec(body).iid;
  if (!Number.isSafeInteger(iid) || (iid as number) <= 0) return null;
  return headIn(await port.get(`projects/${encodeURIComponent(String(project))}/merge_requests/${iid as number}`).catch(() => null));
}

/**
 * Null when the MR is headed by `commit`; otherwise why the confirm failed, naming both commits. `commit` is the one the
 * file write made, read back right after it (null when that read failed: then nothing can be vouched for).
 */
export async function headMismatch(port: GitLabPort, project: ProjectRef, branch: string, commit: string | null, mrBody: unknown): Promise<string | null> {
  const iid = asRec(mrBody).iid;
  const mr = Number.isSafeInteger(iid) ? `!${iid as number}` : 'the MR';
  const dont = `Do not merge ${mr}: close it, delete ${branch}, then try again.`;
  if (!commit) return `Belay could not read back the commit it made on ${branch}, so it cannot vouch for what ${mr} carries. ${dont}`;
  const head = await mrHead(port, project, mrBody);
  if (!head) return `GitLab did not say which commit heads ${mr}, so Belay cannot tell whether it carries only ${commit}, the commit this confirm made. ${dont}`;
  if (head === commit) return null;
  return `${mr} is headed by ${head}, not ${commit}, the commit this confirm made: someone pushed to ${branch} between the commit and the MR. ${dont}`;
}
