// Write routes of the fake: the six PlannedCommands Belay builds, applied to the in-memory state.
import type { FakeState, ProjectData } from './dataset';
import { atLeast, inProject } from './reads';
import { lastCommitOf, writeFile, writeTarget } from './refs';
import { created, fail, ok, type Route } from './server';

const P = 'projects/([^/]+)';
const labelsOf = (s: string | undefined): string[] => (s ?? '').split(',').map((l) => l.trim()).filter(Boolean);
const nowIso = (): string => new Date().toISOString();

const findMr = (p: ProjectData, iid: string) => p.mrs.find((r) => String(r.iid) === iid);
/** A commit's title: the first line of its message. */
const titleOf = (f: Record<string, string>): string => (f.commit_message ?? '').split('\n')[0] ?? '';

/** GitLab's check (Commits::CreateService): start_branch onto a branch that already exists, without force, is refused. */
const branchTaken = (p: ProjectData, f: Record<string, string>): string | null =>
  f.start_branch !== undefined && f.branch !== undefined && f.branch !== f.start_branch && p.branches?.[f.branch] !== undefined && f.force !== 'true'
    ? `A branch called '${f.branch}' already exists. Switch to that branch in order to make changes`
    : null;

/**
 * A file write is a commit on its branch's own tree (refs.ts), checked against the tree it starts from, and it moves the
 * branch's head. `update`: GitLab refuses a create of a file that is there, an update of one that is not, and (its
 * Files::UpdateService check) an update naming a last commit other than the file's on that branch; nothing is written.
 */
function commitTo(p: ProjectData, path: string, f: Record<string, string>, st: FakeState, update: boolean): string | null {
  const at = writeTarget(p, f);
  if (!at) return 'You can only create or edit files when you are on a branch';
  if (path in at.read.files !== update) return update ? 'A file with this name doesn\'t exist' : 'A file with this name already exists';
  const known = f.last_commit_id;
  if (update && known !== undefined && known !== lastCommitOf(at.read, path)) return 'You are attempting to update a file that has changed since you started editing it.';
  const taken = branchTaken(p, f);
  if (taken) return taken;
  const commit = writeFile(at.tree(), path, f.content ?? '', st, titleOf(f));
  if (f.branch) (p.branches ??= {})[f.branch] = commit;
  return null;
}

export const writeRoutes: Route[] = [
  ['POST', new RegExp(`^${P}/merge_requests$`), inProject((p, _m, req, st) => {
    const f = req.fields;
    const iid = Math.max(0, ...p.mrs.map((r) => Number(r.iid))) + 1;
    const mr = {
      id: st.nextId++, iid, project_id: p.raw.id, title: f.title ?? '', description: f.description ?? '', state: 'opened',
      draft: false, source_branch: f.source_branch ?? '', target_branch: f.target_branch ?? '',
      author: { username: String((st.user as { username?: unknown }).username) }, labels: labelsOf(f.labels),
      web_url: `${String(p.raw.web_url)}/-/merge_requests/${iid}`, sha: p.branches?.[f.source_branch ?? ''] ?? null, detailed_merge_status: 'checking',
      created_at: nowIso(), updated_at: nowIso(), merged_at: null, head_pipeline: null,
      force_remove_source_branch: f.remove_source_branch === 'true',
    };
    p.mrs.push(mr);
    p.notes[String(iid)] = [];
    return created(mr);
  })],
  ['POST', new RegExp(`^${P}/merge_requests/(\\d+)/notes$`), inProject((p, m, req, st) => {
    if (!findMr(p, m[2] ?? '')) return fail(404, 'Merge Request Not Found');
    const note = {
      id: st.nextId++, body: req.fields.body ?? '', author: { username: String((st.user as { username?: unknown }).username) },
      system: false, created_at: nowIso(),
    };
    (p.notes[m[2] ?? ''] ??= []).push(note);
    return created(note);
  })],
  ['PUT', new RegExp(`^${P}/merge_requests/(\\d+)$`), inProject((p, m, req) => {
    const mr = findMr(p, m[2] ?? '');
    if (!mr) return fail(404, 'Merge Request Not Found');
    const f = req.fields;
    const drop = new Set(labelsOf(f.remove_labels));
    mr.labels = [...new Set([...(mr.labels as string[]).filter((l) => !drop.has(l)), ...labelsOf(f.add_labels)])];
    mr.updated_at = nowIso();
    return ok(mr);
  })],
  // Issues are not modelled by the fake: the write is logged (st.writes) and acknowledged.
  ['PUT', new RegExp(`^${P}/issues/(\\d+)$`), inProject((_p, m, req) => ok({ iid: Number(m[2]), labels: labelsOf(req.fields.add_labels) }))],
  ['POST', new RegExp(`^${P}/repository/files/([^/]+)$`), inProject((p, m, req, st) => {
    const path = decodeURIComponent(m[2] ?? '');
    const refused = commitTo(p, path, req.fields, st, false);
    if (refused) return fail(400, refused);
    return created({ file_path: path, branch: req.fields.branch });
  })],
  ['PUT', new RegExp(`^${P}/repository/files/([^/]+)$`), inProject((p, m, req, st) => {
    const path = decodeURIComponent(m[2] ?? '');
    const refused = commitTo(p, path, req.fields, st, true);
    if (refused) return fail(400, refused);
    return ok({ file_path: path, branch: req.fields.branch });
  })],
  ['PUT', new RegExp(`^${P}/pipeline_schedules/(\\d+)$`), inProject((p, m, req) => {
    const s = p.schedules.find((x) => String(x.id) === m[2]);
    if (!s) return fail(404, 'Not Found');
    s.active = req.fields.active !== 'false';
    return ok(s);
  })],
  ['POST', new RegExp(`^${P}/deployments/(\\d+)/approval$`), inProject((p, m, req, st) => {
    if (!atLeast(st, 'premium')) return fail(403, 'Forbidden');
    const d = p.deployments.find((x) => String(x.id) === m[2]);
    if (!d) return fail(404, 'Deployment Not Found');
    const status = req.fields.status ?? 'approved';
    d.status = status === 'approved' ? 'running' : 'failed';
    const approval = { user: { username: String((st.user as { username?: unknown }).username) }, status, comment: req.fields.comment ?? null };
    p.approvals[m[2] ?? ''] = approval;
    return created(approval);
  })],
];
