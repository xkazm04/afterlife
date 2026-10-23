// Fleet's agent cost: each runner repo's spend (the desk's rows) put on the Fleet project it works. A repo matches by the
// fleet file's `gitlab` key against the project's GitLab path (the most specific match), else by slug === project id.
// A runner repo that matches no project is listed in `unmatched`, never dropped; a project no runner repo works is absent
// from `byProject` (unknown, not $0). Pure; per project and per group only, never per person.
import type { RunnerDesk } from './types';

/** What the runner spent on one Fleet project. `costUsd` null: no matched repo reported a cost. */
export interface ProjectCost {
  costUsd: number | null;
  waves: number;
  /** The runner slugs put on this project. */
  repos: string[];
}

export interface CostJoin {
  byProject: Record<string, ProjectCost>;
  /** Runner repos that match no Fleet project: "not in Fleet". */
  unmatched: string[];
}

/** A Fleet project as the join reads it: its id, and its GitLab path when known (else its group's path). */
export interface CostProject {
  id: string;
  groupPath?: string;
  pathWithNamespace?: string;
}

const norm = (s: string): string => s.trim().replace(/^\/+|\/+$/g, '').toLowerCase();

/** The project's most specific GitLab path: its own, else group/id, else the id. */
const pathOf = (p: CostProject): string => norm(p.pathWithNamespace ?? (p.groupPath ? `${p.groupPath}/${p.id}` : p.id));

/** The one project a `gitlab` key names: an exact path first, else the one whose path and key end alike. Ambiguous: none. */
function byKey(key: string, projects: readonly CostProject[]): CostProject | null {
  const k = norm(key);
  const exact = projects.filter((p) => pathOf(p) === k);
  if (exact.length) return exact.length === 1 ? exact[0]! : null;
  const tail = projects.filter((p) => pathOf(p).endsWith(`/${k}`) || k.endsWith(`/${pathOf(p)}`));
  return tail.length === 1 ? tail[0]! : null;
}

/** Each runner repo's waves and cost on the Fleet project it matches; the repos that match none, listed. */
export function costByProject(desk: Pick<RunnerDesk, 'rows'>, projects: readonly CostProject[]): CostJoin {
  const byProject: Record<string, ProjectCost> = {};
  const unmatched: string[] = [];
  for (const r of desk.rows) {
    const p = (r.gitlab ? byKey(r.gitlab, projects) : null) ?? projects.find((x) => x.id === r.slug);
    if (!p) {
      unmatched.push(r.slug);
      continue;
    }
    const was = byProject[p.id] ?? { costUsd: null, waves: 0, repos: [] };
    const costUsd = r.costUsd === undefined ? was.costUsd : (was.costUsd ?? 0) + r.costUsd;
    byProject[p.id] = { costUsd, waves: was.waves + r.waves, repos: [...was.repos, r.slug] };
  }
  return { byProject, unmatched };
}

/** A set of projects' spend: the sum of the known costs, how many are metered (a cost known), of how many. */
export interface CostSum {
  costUsd: number | null;
  metered: number;
  of: number;
}

/** The sum over `ids` of the costs the join knows; all unknown: null, never $0. */
export function sumCost(byProject: Readonly<Record<string, ProjectCost>>, ids: readonly string[]): CostSum {
  let costUsd: number | null = null;
  let metered = 0;
  for (const id of ids) {
    const c = byProject[id]?.costUsd;
    if (c === undefined || c === null) continue;
    costUsd = (costUsd ?? 0) + c;
    metered += 1;
  }
  return { costUsd, metered, of: ids.length };
}

/**
 * The join's projects from Fleet rows: the GitLab path read off the project's page address when one is stored (live),
 * else the portfolio's group, the project's group and its id (a root project's group is the portfolio's own last part).
 */
export function costProjects(projects: readonly { id: string; group: string; webUrl?: string | null }[], portfolio: string): CostProject[] {
  const leaf = portfolio.split('/').pop();
  return projects.map((p) => {
    let path: string | undefined;
    try {
      path = p.webUrl ? norm(new URL(p.webUrl).pathname) || undefined : undefined;
    } catch {
      path = undefined;
    }
    return { id: p.id, groupPath: p.group === leaf ? portfolio : `${portfolio}/${p.group}`, ...(path ? { pathWithNamespace: path } : {}) };
  });
}
