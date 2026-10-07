// GET routes of the fake. Plan-gated endpoints answer 403/404 exactly where the live Free group did.
import { createHash } from 'node:crypto';
import type { FakeState, Plan, ProjectData } from './dataset';
import { fail, findProject, ok, paged, type Handler, type Req, type Res, type Route } from './server';

const RANK: Record<Plan, number> = { free: 0, premium: 1, ultimate: 2 };
export const atLeast = (st: FakeState, plan: Plan): boolean => RANK[st.plan] >= RANK[plan];

const P = 'projects/([^/]+)';
type ProjectHandler = (p: ProjectData, m: RegExpExecArray, req: Req, st: FakeState) => Res;

/** Wraps a handler that needs the project in m[1]. */
export const inProject = (fn: ProjectHandler): Handler => (st, m, req) => {
  const p = findProject(st, m[1] ?? '');
  return p ? fn(p, m, req, st) : fail(404, 'Project Not Found');
};

const list = (items: unknown[], q: URLSearchParams): Res => ok(paged(items, q));
const byId = (items: Record<string, unknown>[]) => [...items].sort((a, b) => Number(b.id) - Number(a.id));

/** A content hash, like a git blob id: it changes when the file does (the poller skips an unchanged ledger by it). */
const blobId = (content: string): string => createHash('sha1').update(content).digest('hex');

/** GitLab's last_commit_id of a file: the commit the fake's last write of it made, else one derived from its content. */
export const lastCommitOf = (p: ProjectData, path: string): string =>
  p.fileCommits?.[path] ?? createHash('sha1').update(`commit\0${path}\0${p.files[path] ?? ''}`).digest('hex');

function dirEntries(p: ProjectData, dir: string, recursive: boolean): Record<string, string>[] {
  const out = new Map<string, Record<string, string>>();
  const prefix = dir ? `${dir.replace(/\/$/, '')}/` : '';
  for (const path of Object.keys(p.files).filter((f) => f.startsWith(prefix))) {
    const rest = path.slice(prefix.length);
    const [head = '', ...tail] = rest.split('/');
    if (recursive || tail.length === 0) out.set(path, { id: blobId(p.files[path] ?? ''), name: rest.split('/').at(-1) ?? head, type: 'blob', path });
    if (!recursive && tail.length > 0) out.set(prefix + head, { id: `tree-${prefix + head}`, name: head, type: 'tree', path: prefix + head });
  }
  return [...out.values()];
}

function fileJson(p: ProjectData, path: string, ref: string): Res {
  const content = p.files[path];
  if (content === undefined) return fail(404, 'File Not Found');
  return ok({
    file_name: path.split('/').at(-1), file_path: path, size: Buffer.byteLength(content), encoding: 'base64', ref,
    blob_id: blobId(content), last_commit_id: lastCommitOf(p, path), content: Buffer.from(content, 'utf8').toString('base64'),
  });
}

const allMrs = (st: FakeState, q: URLSearchParams, only?: ProjectData): Record<string, unknown>[] => {
  const state = q.get('state') ?? 'all';
  const labels = (q.get('labels') ?? '').split(',').filter(Boolean);
  const after = q.get('updated_after');
  return byId((only ? [only] : st.projects).flatMap((p) => p.mrs)).filter(
    (r) =>
      (state === 'all' || r.state === state) &&
      labels.every((l) => (r.labels as string[]).includes(l)) &&
      (!after || String(r.updated_at) > after),
  );
};

export const readRoutes: Route[] = [
  ['GET', /^user$/, (st) => ok(st.user)],
  ['GET', /^metadata$/, (st) => ok(st.instance)],
  ['GET', /^groups\/[^/]+$/, (st) => ok(st.group)],
  ['GET', /^namespaces\/[^/]+$/, (st) => ok(st.namespace)],
  ['GET', /^groups\/[^/]+\/projects$/, (st, _m, r) => list(st.projects.map((p) => p.raw), r.query)],
  ['GET', /^groups\/[^/]+\/merge_requests$/, (st, _m, r) => list(allMrs(st, r.query), r.query)],
  ['GET', /^groups\/[^/]+\/releases$/, (st, _m, r) => list(st.projects.flatMap((p) => p.releases), r.query)],
  ['GET', /^groups\/[^/]+\/service_accounts$/, () => ok([])],
  ['GET', /^groups\/[^/]+\/audit_events$/, (st) => (atLeast(st, 'premium') ? ok([]) : fail(403, 'Forbidden'))],
  ['GET', /^ai\/duo_workflows\/workflows$/, (st) => (atLeast(st, 'premium') ? ok([]) : fail(404, 'Not Found'))],

  ['GET', new RegExp(`^${P}/pipelines$`), inProject((p, _m, { query: q }) => {
    const rows = byId(p.pipelines).filter((x) => (!q.get('ref') || x.ref === q.get('ref')) && (!q.get('status') || x.status === q.get('status')));
    return list(rows, q);
  })],
  ['GET', new RegExp(`^${P}/pipelines/(\\d+)/jobs$`), inProject((p, m, { query: q }) => list(p.jobs[m[2] ?? ''] ?? [], q))],
  ['GET', new RegExp(`^${P}/pipelines/(\\d+)/test_report_summary$`), inProject((p, m) => {
    const r = p.testReports[m[2] ?? ''];
    return r ? ok(r) : fail(404, 'Not found');
  })],
  ['GET', new RegExp(`^${P}/jobs/(\\d+)/trace$`), inProject((p, m) => {
    const t = p.traces[m[2] ?? ''];
    return t === undefined ? fail(404, 'Job Not Found') : { status: 200, text: t };
  })],

  ['GET', new RegExp(`^${P}/merge_requests$`), inProject((p, _m, { query: q }, st) => list(allMrs(st, q, p), q))],
  ['GET', new RegExp(`^${P}/merge_requests/(\\d+)/notes$`), inProject((p, m, { query: q }) => list(p.notes[m[2] ?? ''] ?? [], q))],
  ['GET', new RegExp(`^${P}/merge_requests/(\\d+)/diffs$`), inProject((p, m, { query: q }) => list(p.diffs[m[2] ?? ''] ?? [], q))],

  ['GET', new RegExp(`^${P}/environments$`), inProject((p, _m, { query: q }) => list(p.environments, q))],
  ['GET', new RegExp(`^${P}/deployments$`), inProject((p, _m, { query: q }) => {
    const env = q.get('environment');
    const rows = byId(p.deployments).filter((d) => (!env || (d.environment as { name: string }).name === env) && (!q.get('status') || d.status === q.get('status')));
    return list(rows, q);
  })],
  ['GET', new RegExp(`^${P}/releases$`), inProject((p, _m, { query: q }) => list(p.releases, q))],
  ['GET', new RegExp(`^${P}/pipeline_schedules$`), inProject((p, _m, { query: q }) => list(p.schedules, q))],
  ['GET', new RegExp(`^${P}/vulnerabilities$`), inProject((p, _m, { query: q }, st) => (atLeast(st, 'ultimate') ? list(p.vulnerabilities, q) : fail(403, 'Forbidden')))],

  ['GET', new RegExp(`^${P}/repository/tree$`), inProject((p, _m, { query: q }) => list(dirEntries(p, q.get('path') ?? '', q.get('recursive') === 'true'), q))],
  ['GET', new RegExp(`^${P}/repository/files/([^/]+)$`), inProject((p, m, { query: q }) => fileJson(p, decodeURIComponent(m[2] ?? ''), q.get('ref') ?? 'main'))],
];
