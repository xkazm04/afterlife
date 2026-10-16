// What every plan needs: the port to read through (never to write with: writes are only described here), the clock, who
// the operator is, and where the project and the policy project live.
import type { GitLabPort } from '@/server/gitlab/port';
import type { PlannedCommand } from '@/server/gitlab/plan/types';
import type { GlFile, GlProject } from '@/server/gitlab/types';
import type { PollerConfig } from '@/server/poller/config';
import type { ArmConfig } from '../arm/config';
import type { ProjectLedger } from './trial';

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
  /** The belay-ledger the index holds for an index project (./trial.ts), read only. Absent (demo) or null: not known. */
  ledgerOf?: (indexId: string) => Promise<ProjectLedger | null>;
}

export interface Plan {
  title: string;
  summary: string;
  commands: PlannedCommand[];
  diff: string[];
  /** The branch a branch MR creates (mr/branchMr.ts): the MR's head is checked against the confirm's commit (F38). */
  branch?: string;
  /** What the operator must know before the click, in order. */
  notes?: readonly string[];
}

export interface Located {
  project: GlProject;
  policy: GlProject;
}

/** A target as targetIn found it, with the group's full path and its project list (a plan may need either). */
export interface Targeted {
  project: GlProject;
  group: string;
  all: GlProject[];
}

/**
 * The one target rule, for every write (locate) and arm (arm/plan.ts targetOf). Read only. The project is the one the index
 * names, never ambiguous (F48), never one of Belay's own (`infra`, F50), and under the group's path (F37, F47).
 */
export async function targetIn(ctx: Pick<PlanContext, 'port' | 'groupId' | 'gitlabId'>, indexId: string, infra: readonly string[]): Promise<Targeted> {
  const [all, gid, group] = await Promise.all([ctx.port.listProjects(ctx.groupId), ctx.gitlabId(indexId), ctx.port.getGroup(ctx.groupId)]);
  const matches = all.filter((p) => (gid !== null ? p.id === gid : p.path === indexId));
  if (matches.length > 1) { // a path is unique in its namespace only: two subgroups may each hold one (F48)
    throw new ActionRefused(`${indexId} names ${matches.length} projects (${matches.map((p) => p.pathWithNamespace).join(', ')}) and the index has no GitLab id for it: poll first`);
  }
  const project = matches[0];
  if (!project) throw new ActionRefused(`${indexId} is not a project Belay has read from GitLab yet`);
  if (infra.includes(project.path)) { // as the poller, which never watches them: tier-state.yml moves only by revoke or promote (F50)
    throw new ActionRefused(`${project.path} is Belay's own project, not one it watches: nothing is planned in it`);
  }
  if (!project.pathWithNamespace.startsWith(`${group.fullPath}/`)) { // F37, F47
    throw new ActionRefused(`${project.pathWithNamespace} is not in ${group.fullPath} (it is shared into it from elsewhere): Belay writes only in a project of the paired group`);
  }
  return { project, group: group.fullPath, all };
}

/**
 * The project (targetIn) and the group's own belay-policy. Read only. belay-policy is the one at <group>/belay-policy, the
 * file the gate reads: a project of that name in a subgroup, or shared in from elsewhere, is never written as the policy (F46).
 */
export async function locate(ctx: PlanContext, indexId: string): Promise<Located> {
  const { project, group, all } = await targetIn(ctx, indexId, ctx.cfg.infra);
  const policyPath = `${group}/${ctx.cfg.policyProject}`;
  const policy = all.find((p) => p.pathWithNamespace === policyPath);
  if (!policy) throw new ActionRefused(`the group has no ${policyPath} project: policy cannot be changed`);
  return { project, policy };
}

export const dateOnly = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * The minute a record is stamped with. Confirm plans again and runs only if the commands are the preview's to the byte
 * (previewId): a stamp to the millisecond changed with every click, so a revoke or a promotion never ran live (F52).
 */
export const minuteOf = (d: Date): Date => new Date(Math.floor(d.getTime() / 60_000) * 60_000);

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
