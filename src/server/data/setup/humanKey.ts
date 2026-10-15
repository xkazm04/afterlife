// The human key, read back, read only. Every promotion Belay prepares states one precondition (HUMAN_KEY,
// lib/promotion/rules.ts): a person merges the policy MR. GitLab holds it only while three settings stand on belay-policy:
// push to its default branch is allowed to no one, a merge there needs Code Owner approval (code_owner_approval_required),
// and an MR's author cannot approve it (merge_requests_author_approval false; Premium and up). belay-policy is the one
// planPromote writes to (<group>/<policyProject>, F46). Every call is a GET through the port (glab api); a read GitLab
// refuses or that fails leaves the key unknown with the reason, never verified. docs.gitlab.com/api/protected_branches,
// /api/merge_request_approvals.
import type { HumanKeyRead } from '@/lib/promotion/types';
import type { GitLabPort } from '@/server/gitlab/port';
import { obj, why } from './ctx';
import { protection } from './protections';

type Rec = Record<string, unknown>;
/** One read: GitLab's answer (null: the branch is not protected), or why it could not be made. */
export type Seen = { ok: true; value: Rec | null } | { ok: false; why: string };

/** The demo's answer: illustrative, not read from GitLab (the demo reads no GitLab). */
export const DEMO_HUMAN_KEY: HumanKeyRead = { state: 'verified', missing: [], where: 'belay-policy main', demo: true };

const ROLE: Record<number, string> = { 30: 'Developers + Maintainers', 40: 'Maintainers', 60: 'Admins' };
const isRec = (x: unknown): x is Rec => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Whom one push access entry lets push: null for No one. */
function pusher(x: Rec): string | null {
  if (x.user_id != null) return `user ${String(x.user_id)}`;
  if (x.group_id != null) return `group ${String(x.group_id)}`;
  if (x.deploy_key_id != null) return `deploy key ${String(x.deploy_key_id)}`;
  if (x.access_level === 0) return null;
  if (typeof x.access_level === 'number' && ROLE[x.access_level]) return ROLE[x.access_level]!;
  if (typeof x.access_level_description === 'string' && x.access_level_description) return x.access_level_description;
  return `access level ${String(x.access_level)}`;
}

/**
 * The three settings judged from what was read. Failed when any one is not in place (naming each; `why` adds what could not
 * be read beside it); unknown when none fails but one could not be read; verified only when all three read back in place.
 */
export function judgeHumanKey(at: { project: string; branch: string }, branch: Seen, approvals: Seen): HumanKeyRead {
  const where = `${at.project} ${at.branch}`;
  const missing: string[] = [];
  const unread: string[] = [];
  if (!branch.ok) unread.push(`the protection of ${where} (${branch.why})`);
  else if (!branch.value) missing.push(`${where} is not a protected branch`);
  else {
    const r = branch.value;
    const push = Array.isArray(r.push_access_levels) ? r.push_access_levels.filter(isRec) : [];
    const who = [...new Set(push.map(pusher).filter((x): x is string => x !== null))];
    if (!push.length) missing.push(`GitLab states no push access for ${where} (it must be No one)`);
    else if (who.length) missing.push(`push to ${where} is allowed to ${who.join(', ')} (it must be No one)`);
    if (r.code_owner_approval_required !== true) missing.push(`a merge into ${where} does not require Code Owner approval`);
  }
  if (!approvals.ok) unread.push(`${at.project}'s approval settings (${approvals.why})`);
  else if (approvals.value?.merge_requests_author_approval !== false) missing.push(`an MR's author can approve their own MR in ${at.project}`);
  const notRead = unread.length ? { why: unread.join('; ') } : {};
  if (missing.length) return { state: 'failed', missing, where, ...notRead };
  if (unread.length) return { state: 'unknown', missing: [], where, ...notRead };
  return { state: 'verified', missing: [], where };
}

const seen = async (read: () => Promise<Rec | null>): Promise<Seen> => {
  try {
    return { ok: true, value: await read() };
  } catch (e) {
    return { ok: false, why: why(e) };
  }
};

/** Reads the human key on the group's belay-policy now: the group's listing, then its default branch's rule and approvals. */
export async function readHumanKey(port: GitLabPort, groupId: string | number, policyProject: string): Promise<HumanKeyRead> {
  let found;
  try {
    const [all, group] = await Promise.all([port.listProjects(groupId), port.getGroup(groupId)]);
    const path = `${group.fullPath}/${policyProject}`;
    found = { path, p: all.find((x) => x.pathWithNamespace === path) };
  } catch (e) {
    return { state: 'unknown', missing: [], why: `finding ${policyProject} failed: ${why(e)}` };
  }
  const p = found.p;
  if (!p) return { state: 'failed', missing: [`the group has no ${found.path} project`] };
  const branch = p.defaultBranch ?? 'main';
  const [b, a] = await Promise.all([
    seen(() => protection({ port }, p, 'protected_branches', branch)),
    seen(async () => obj(await port.get(`projects/${p.id}/approvals`), 'approvals')),
  ]);
  return judgeHumanKey({ project: p.path, branch }, b, a);
}
