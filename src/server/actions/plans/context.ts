// What every plan needs: the port to read through (never to write with: writes are only described here), the clock, who
// the operator is, and where the project and the policy project live.
import { isKind } from '@/server/gitlab/errors';
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
 * The index project among the group's projects, for every plan that writes in one (locate, and arm's targetOf): a path is
 * unique in its namespace only, so two matches with no GitLab id to tell them apart are refused (F48); Belay's own projects
 * are never a target, as the poller never watches them (F50); and it must be under the group's path (F47, F37).
 */
export function watchedProject(all: readonly GlProject[], gid: number | null, indexId: string, infra: readonly string[], groupPath: string): GlProject {
  const matches = all.filter((p) => (gid !== null ? p.id === gid : p.path === indexId));
  if (matches.length > 1) {
    throw new ActionRefused(`${indexId} names ${matches.length} projects (${matches.map((p) => p.pathWithNamespace).join(', ')}) and the index has no GitLab id for it: poll first`);
  }
  const project = matches[0];
  if (!project) throw new ActionRefused(`${indexId} is not a project Belay has read from GitLab yet`);
  if (infra.includes(project.path)) { // tier-state.yml moves only by revoke or promote
    throw new ActionRefused(`${project.path} is Belay's own project, not one it watches: nothing is planned in it`);
  }
  if (!project.pathWithNamespace.startsWith(`${groupPath}/`)) {
    throw new ActionRefused(`${project.pathWithNamespace} is not in ${groupPath} (it is shared into it from elsewhere): Belay writes only in a project of the paired group`);
  }
  return project;
}

/**
 * The project and the group's own belay-policy. Read only. belay-policy is the one at <group>/belay-policy, the file the
 * gate reads: a project of that name in a subgroup, or shared in from elsewhere, is never written as the policy (F46).
 */
export async function locate(ctx: PlanContext, indexId: string): Promise<Located> {
  const [all, gid, group] = await Promise.all([ctx.port.listProjects(ctx.groupId), ctx.gitlabId(indexId), ctx.port.getGroup(ctx.groupId)]);
  const project = watchedProject(all, gid, indexId, ctx.cfg.infra, group.fullPath);
  const policy = all.find((p) => p.pathWithNamespace === `${group.fullPath}/${ctx.cfg.policyProject}`);
  if (!policy) throw new ActionRefused(`the group has no ${group.fullPath}/${ctx.cfg.policyProject} project: policy cannot be changed`);
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

/**
 * The branch a plan names must not exist yet (F38 arm, F85 gap): Belay commits only to a new branch and never forces. A 404 is
 * the only "absent": any other failure refuses, because a branch left by an earlier MR, a half-run confirm or anyone else
 * would fail the confirm after the click, or carry commits nobody saw.
 */
export async function noBranch(port: GitLabPort, project: Pick<GlProject, 'id' | 'pathWithNamespace'>, branch: string): Promise<void> {
  let body: unknown;
  try {
    body = await port.get(`projects/${encodeURIComponent(String(project.id))}/repository/branches/${encodeURIComponent(branch)}`);
  } catch (e) {
    if (isKind(e, 'not-found')) return;
    throw new ActionRefused(`Belay could not read whether ${branch} exists in ${project.pathWithNamespace} (${e instanceof Error ? e.message : String(e)}): nothing is planned`);
  }
  const id = (body as { commit?: { id?: unknown } } | null)?.commit?.id;
  const head = typeof id === 'string' && COMMIT_ID.test(id) ? `its head is ${id.slice(0, 8)}` : 'GitLab did not say its head';
  throw new ActionRefused(`${branch} already exists in ${project.pathWithNamespace} (${head}): Belay commits only to a new branch, so delete the branch, or merge or close its MR, then try again`);
}
