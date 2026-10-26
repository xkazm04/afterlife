// The persistent index is one cache for every group this machine ever polled: a project row carries no group id, only
// its subgroup path and its GitLab page, and a cycle marks a project it no longer lists stale, never deletes it. So after
// a group change (/start's set-setup, restartRuntime) the previous group's projects would stay on the Fleet as stale.
// The snapshot is scoped to the watched group by each linked project's page (https://<host>/<group>/...): a project of
// another namespace is dropped, a seeded or never-polled one (no page) is kept. The group path comes from the pairing row
// a cycle writes on success; before one succeeded, a restarted runtime keeps no linked project (it cannot tell whose
// they are), a first start keeps them all, as before.
import { listProjects } from '@/server/index/repositories/fleet/project';
import { listPollStates, projectSource } from '@/server/index/repositories/pollState';
import type { Queryable } from '@/server/index/repositories/sql';
import type { LiveSnapshot } from './snapshot';

/** The path of a GitLab page ("https://gitlab.com/acme/api" -> "/acme/api"), lower case; null when it is no URL. */
const pathOf = (url: string): string | null => {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return null;
  }
};

/**
 * The snapshot with only the projects of `group` (its full path). `group` null: unknown, so `strict` decides: drop
 * every linked project (a restarted runtime) or keep the snapshot as it is (a first start).
 */
export async function scopeToGroup(db: Queryable, snap: LiveSnapshot, group: string | null, strict: boolean): Promise<LiveSnapshot> {
  if (group === null && !strict) return snap;
  const prefix = group === null ? null : `/${group.toLowerCase()}/`;
  const rows = new Map((await listProjects(db)).map((r) => [r.id, r]));
  const foreign = (id: string): boolean => {
    const row = rows.get(id);
    if (!row || row.gitlabId === null || row.webUrl === null) return false;
    const p = pathOf(row.webUrl);
    return prefix === null || p === null || !p.startsWith(prefix);
  };
  const dropped = new Set(snap.data.fleet.projects.filter((p) => foreign(p.id)).map((p) => p.id));
  if (dropped.size === 0) return snap;
  const projects = snap.data.fleet.projects.filter((p) => !dropped.has(p.id));
  const keep = <T>(rec: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(rec).filter(([id]) => !dropped.has(id)));
  // The poll's project counts are the kept linked projects' rows; the group's own row (age, error) is unchanged.
  const linked = new Set([...rows.values()].filter((r) => r.gitlabId !== null && !dropped.has(r.id)).map((r) => projectSource(r.id)));
  const polled = (await listPollStates(db, 'project:')).filter((r) => linked.has(r.source));
  const { data } = snap;
  return {
    ...snap,
    data: {
      ...data,
      fleet: { ...data.fleet, projects, groups: data.fleet.groups.filter((g) => projects.some((p) => p.group === g)) },
      portfolio: { ...data.portfolio, projectsWatched: projects.filter((p) => p.state === 'watching').length },
      estate: keep(data.estate),
      stability: keep(data.stability),
      poll: { ...data.poll, failing: polled.filter((r) => r.lastError !== null).length, of: polled.length },
    },
  };
}
