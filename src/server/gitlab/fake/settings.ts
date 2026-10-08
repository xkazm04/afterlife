// Routes of the fake for a project's settings, as Setup's step reads ask for them and step 9's commands write them. [R]
// from the docs, not recorded: GET /projects/:id (docs.gitlab.com/api/projects); GET /projects/:id/runners with its
// `tag_list` and `status` filters (/api/runners); protected branches and tags, read, created (409 when the name is
// already protected) and unprotected (/api/protected_branches, /api/protected_tags); the job token allowlist
// (/api/project_job_token_scopes); the project's approval settings, Premium and up (/api/merge_request_approvals).
// Like reads.ts, a project the fake does not hold answers 404.
import type { Rec } from '../adapter/fields';
import type { ProjectData } from './dataset';
import { atLeast, inProject } from './reads';
import { created, fail, ok, paged, type Req, type Route } from './server';

const P = 'projects/([^/]+)';
const ROLE: Record<number, string> = { 0: 'No one', 30: 'Developers + Maintainers', 40: 'Maintainers', 60: 'Admins' };

let nextLevel = 1;
const level = (raw: string | undefined): Rec => {
  const access = Number(raw ?? 40);
  return { id: nextLevel++, access_level: access, access_level_description: ROLE[access] ?? String(access), user_id: null, group_id: null };
};

const branchOf = (name: string, f: Req['fields']): Rec => ({
  id: nextLevel++, name, push_access_levels: [level(f.push_access_level)], merge_access_levels: [level(f.merge_access_level)], unprotect_access_levels: [],
  allow_force_push: f.allow_force_push === 'true', code_owner_approval_required: f.code_owner_approval_required === 'true',
});
const tagOf = (name: string, f: Req['fields']): Rec => ({ name, create_access_levels: [level(f.create_access_level)] });

type Kind = 'protectedBranches' | 'protectedTags';
const PATH: Record<Kind, string> = { protectedBranches: 'protected_branches', protectedTags: 'protected_tags' };
const WHAT: Record<Kind, string> = { protectedBranches: 'Protected branch', protectedTags: 'Protected tag' };

function protectedRoutes(kind: Kind, make: (name: string, f: Req['fields']) => Rec): Route[] {
  const table = (p: ProjectData): Record<string, Rec> => (p[kind] ??= {});
  return [
    ['GET', new RegExp(`^${P}/${PATH[kind]}$`), inProject((p, _m, { query: q }) => ok(paged(Object.values(table(p)), q)))],
    ['GET', new RegExp(`^${P}/${PATH[kind]}/([^/]+)$`), inProject((p, m) => {
      const r = table(p)[decodeURIComponent(m[2] ?? '')];
      return r ? ok(r) : fail(404, 'Not Found');
    })],
    ['POST', new RegExp(`^${P}/${PATH[kind]}$`), inProject((p, _m, req) => {
      const name = req.fields.name ?? '';
      if (table(p)[name]) return fail(409, `${WHAT[kind]} '${name}' already exists`);
      return created((table(p)[name] = make(name, req.fields)));
    })],
    ['DELETE', new RegExp(`^${P}/${PATH[kind]}/([^/]+)$`), inProject((p, m) => {
      const name = decodeURIComponent(m[2] ?? '');
      if (!table(p)[name]) return fail(404, 'Not Found');
      delete table(p)[name];
      return { status: 204, text: '' };
    })],
  ];
}

export const settingsRoutes: Route[] = [
  ['GET', new RegExp(`^${P}$`), inProject((p) => ok(p.raw))],
  ['GET', new RegExp(`^${P}/runners$`), inProject((p, _m, { query: q }) => {
    const tags = (q.get('tag_list') ?? '').split(',').filter(Boolean);
    const status = q.get('status');
    const all = (p.runners ?? []).filter((r) => tags.every((t) => (r.tag_list as string[] | undefined)?.includes(t)) && (!status || r.status === status));
    // The list answer carries no tag_list (only GET /runners/:id does).
    return ok(paged(all.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'tag_list'))), q));
  })],
  ...protectedRoutes('protectedBranches', branchOf),
  ...protectedRoutes('protectedTags', tagOf),
  ['GET', new RegExp(`^${P}/job_token_scope/allowlist$`), inProject((p, _m, { query: q }, st) =>
    ok(paged(st.projects.filter((x) => (p.jobTokenAllowlist ?? []).includes(Number(x.raw.id))).map((x) => x.raw), q)))],
  ['GET', new RegExp(`^${P}/approvals$`), inProject((p, _m, _r, st) =>
    atLeast(st, 'premium') ? ok({ merge_requests_author_approval: true, ...p.approvalSettings }) : fail(403, 'Forbidden'))],
];
