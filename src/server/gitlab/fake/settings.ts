// GET routes of the fake for a project's settings, as Setup's step reads ask for them. [R] from the docs, not recorded:
// GET /projects/:id (docs.gitlab.com/api/projects) and GET /projects/:id/runners with its `tag_list` and `status`
// filters (docs.gitlab.com/api/runners). Like reads.ts, a project the fake does not hold answers 404.
import { inProject } from './reads';
import { ok, paged, type Route } from './server';

const P = 'projects/([^/]+)';

export const settingsRoutes: Route[] = [
  ['GET', new RegExp(`^${P}$`), inProject((p) => ok(p.raw))],
  ['GET', new RegExp(`^${P}/runners$`), inProject((p, _m, { query: q }) => {
    const tags = (q.get('tag_list') ?? '').split(',').filter(Boolean);
    const status = q.get('status');
    const all = (p.runners ?? []).filter((r) => tags.every((t) => (r.tag_list as string[] | undefined)?.includes(t)) && (!status || r.status === status));
    // The list answer carries no tag_list (only GET /runners/:id does).
    return ok(paged(all.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'tag_list'))), q));
  })],
];
