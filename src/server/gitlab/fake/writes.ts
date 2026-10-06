// Write routes of the fake: the six PlannedCommands Belay builds, applied to the in-memory state.
import type { ProjectData } from './dataset';
import { atLeast, inProject } from './reads';
import { created, fail, ok, type Route } from './server';

const P = 'projects/([^/]+)';
const labelsOf = (s: string | undefined): string[] => (s ?? '').split(',').map((l) => l.trim()).filter(Boolean);
const nowIso = (): string => new Date().toISOString();

const findMr = (p: ProjectData, iid: string) => p.mrs.find((r) => String(r.iid) === iid);

export const writeRoutes: Route[] = [
  ['POST', new RegExp(`^${P}/merge_requests$`), inProject((p, _m, req, st) => {
    const f = req.fields;
    const iid = Math.max(0, ...p.mrs.map((r) => Number(r.iid))) + 1;
    const mr = {
      id: st.nextId++, iid, project_id: p.raw.id, title: f.title ?? '', description: f.description ?? '', state: 'opened',
      draft: false, source_branch: f.source_branch ?? '', target_branch: f.target_branch ?? '',
      author: { username: String((st.user as { username?: unknown }).username) }, labels: labelsOf(f.labels),
      web_url: `${String(p.raw.web_url)}/-/merge_requests/${iid}`, sha: null, detailed_merge_status: 'checking',
      created_at: nowIso(), updated_at: nowIso(), merged_at: null, head_pipeline: null,
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
  ['POST', new RegExp(`^${P}/repository/files/([^/]+)$`), inProject((p, m, req) => {
    const path = decodeURIComponent(m[2] ?? '');
    if (path in p.files) return fail(400, 'A file with this name already exists');
    p.files[path] = req.fields.content ?? '';
    return created({ file_path: path, branch: req.fields.branch });
  })],
  ['PUT', new RegExp(`^${P}/repository/files/([^/]+)$`), inProject((p, m, req) => {
    const path = decodeURIComponent(m[2] ?? '');
    if (!(path in p.files)) return fail(400, 'A file with this name doesn\'t exist');
    p.files[path] = req.fields.content ?? '';
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
