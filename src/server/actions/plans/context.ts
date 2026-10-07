// What every plan needs: the port to read through (never to write with: writes are only described here), the clock, who
// the operator is, and where the project and the policy project live.
import type { GitLabPort } from '@/server/gitlab/port';
import type { PlannedCommand } from '@/server/gitlab/plan/types';
import type { GlFile, GlProject } from '@/server/gitlab/types';
import type { PollerConfig } from '@/server/poller/config';
import type { ArmConfig } from '../arm/config';

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
  /** The per-install values an arm MR names (arm/config.ts). Absent: an arm is refused. */
  arm?: ArmConfig;
}

export interface Plan {
  title: string;
  summary: string;
  commands: PlannedCommand[];
  diff: string[];
  /** The branch the commands create, when they create one. */
  branch?: string;
  /** What the operator must know before the click, in order. */
  notes?: readonly string[];
}

export interface Located {
  project: GlProject;
  policy: GlProject;
}

/**
 * The project and the group's own belay-policy. Read only. belay-policy is the one at <group>/belay-policy, the file the
 * gate reads: a project of that name in a subgroup, or shared in from elsewhere, is never written as the policy (F46).
 */
export async function locate(ctx: PlanContext, indexId: string): Promise<Located> {
  const [all, gid, group] = await Promise.all([ctx.port.listProjects(ctx.groupId), ctx.gitlabId(indexId), ctx.port.getGroup(ctx.groupId)]);
  const project = all.find((p) => (gid !== null ? p.id === gid : p.path === indexId));
  const policyPath = `${group.fullPath}/${ctx.cfg.policyProject}`;
  const policy = all.find((p) => p.pathWithNamespace === policyPath);
  if (!project) throw new ActionRefused(`${indexId} is not a project Belay has read from GitLab yet`);
  if (!policy) throw new ActionRefused(`the group has no ${policyPath} project: policy cannot be changed`);
  return { project, policy };
}

export const dateOnly = (d: Date): string => d.toISOString().slice(0, 10);

/** Without the file's last commit, GitLab cannot be asked to refuse a stale write: such a write is not planned at all. */
export const NO_LAST_COMMIT =
  'GitLab did not say which commit last changed tier-state.yml, so a write from a stale read could not be refused; nothing is planned';

/** A commit id as GitLab gives one: 40 hex digits, or 64 in a SHA-256 repository. */
export const COMMIT_ID = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

/** The file's last commit, as it goes into last_commit_id: anything that is not a commit id is no answer. */
export function lastCommitOf(file: GlFile): string {
  if (!file.lastCommitId || !COMMIT_ID.test(file.lastCommitId)) throw new ActionRefused(NO_LAST_COMMIT);
  return file.lastCommitId;
}
