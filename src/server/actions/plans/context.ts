// What every plan needs: the port to read through (never to write with: writes are only described here), the clock, who
// the operator is, and where the project and the policy project live.
import type { GitLabPort } from '@/server/gitlab/port';
import type { PlannedCommand } from '@/server/gitlab/plan/types';
import type { GlProject } from '@/server/gitlab/types';
import type { PollerConfig } from '@/server/poller/config';

/** A request the action refuses, with the reason the operator reads. Nothing has run. */
export class ActionRefused extends Error {}

export interface PlanContext {
  port: GitLabPort;
  groupId: string | number;
  cfg: PollerConfig;
  now: Date;
  /** The operator's GitLab username (glab's login). */
  operator: string;
  /** The GitLab project id of an index project, when the index knows it. */
  gitlabId: (indexId: string) => Promise<number | null>;
}

export interface Plan {
  title: string;
  summary: string;
  commands: PlannedCommand[];
  diff: string[];
}

export interface Located {
  project: GlProject;
  policy: GlProject;
}

export async function locate(ctx: PlanContext, indexId: string): Promise<Located> {
  const all = await ctx.port.listProjects(ctx.groupId);
  const gid = await ctx.gitlabId(indexId);
  const project = all.find((p) => (gid !== null ? p.id === gid : p.path === indexId));
  const policy = all.find((p) => p.path === ctx.cfg.policyProject);
  if (!project) throw new ActionRefused(`${indexId} is not a project Belay has read from GitLab yet`);
  if (!policy) throw new ActionRefused(`the group has no ${ctx.cfg.policyProject} project: policy cannot be changed`);
  return { project, policy };
}

export const dateOnly = (d: Date): string => d.toISOString().slice(0, 10);

/** Without the file's last commit, GitLab cannot be asked to refuse a stale write: such a write is not planned at all. */
export const NO_LAST_COMMIT =
  'GitLab did not say which commit last changed tier-state.yml, so a write from a stale read could not be refused; nothing is planned';
