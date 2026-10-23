// One shape for every MR Belay opens (promote, enroll, a gap, arm and disarm): commits on a branch the plan creates off the
// base, then one MR from it. Built here, each gets the same guarantees, so none can forget one:
// - the branch is new or the plan refuses at preview, naming it and its head (F38, F85): never committed onto after the click;
// - the first commit creates the branch (start_branch), force is never set;
// - the MR asks GitLab to remove the branch when it merges, so the next same-day plan does not find it left over;
// - the plan names its branch, and a confirm of it is done only when the MR is headed by the commit it made (arm/head.ts).
import { isKind } from '@/server/gitlab/errors';
import type { CommitFileInput, CreateMrInput, PlannedCommand } from '@/server/gitlab/plan/types';
import type { GlProject } from '@/server/gitlab/types';
import { ActionRefused, COMMIT_ID, type PlanContext } from '../context';

type Where = Pick<GlProject, 'id' | 'pathWithNamespace'>;

/**
 * The branch must not exist yet. A 404 is the only "absent": any other failure refuses, because a branch left by an earlier
 * MR, a half-run confirm or anyone else would fail the confirm after the click, or carry commits nobody saw.
 */
export async function newBranch(ctx: Pick<PlanContext, 'port'>, project: Where, branch: string): Promise<void> {
  let body: unknown;
  try {
    body = await ctx.port.get(`projects/${encodeURIComponent(String(project.id))}/repository/branches/${encodeURIComponent(branch)}`);
  } catch (e) {
    if (isKind(e, 'not-found')) return;
    throw new ActionRefused(`Belay could not read whether ${branch} exists in ${project.pathWithNamespace} (${e instanceof Error ? e.message : String(e)}): nothing is planned`);
  }
  const id = (body as { commit?: { id?: unknown } } | null)?.commit?.id;
  const head = typeof id === 'string' && COMMIT_ID.test(id) ? `its head is ${id.slice(0, 8)}` : 'GitLab did not say its head';
  throw new ActionRefused(`${branch} already exists in ${project.pathWithNamespace} (${head}): Belay commits only to a new branch, so delete the branch, or merge or close its MR, then try again`);
}

export interface BranchMrInput {
  project: Where;
  /** The branch the new one starts from and the MR targets: the project's default branch. */
  base: string;
  branch: string;
  /** In order; the first creates the branch. */
  commits: ReadonlyArray<Omit<CommitFileInput, 'project' | 'branch' | 'startBranch'>>;
  mr: Omit<CreateMrInput, 'project' | 'sourceBranch' | 'targetBranch' | 'removeSourceBranch'>;
}

/** The branch is checked new (newBranch), then the commits and the MR are planned. Reads only; writes nothing. */
export async function branchMr(ctx: Pick<PlanContext, 'port'>, i: BranchMrInput): Promise<{ branch: string; commands: PlannedCommand[] }> {
  if (!i.commits.length) throw new ActionRefused(`nothing to commit on ${i.branch}: nothing is planned`);
  await newBranch(ctx, i.project, i.branch);
  const p = i.project.id;
  return {
    branch: i.branch,
    commands: [
      ...i.commits.map((c, n) => ctx.port.plan.commitFile({ ...c, project: p, branch: i.branch, ...(n === 0 ? { startBranch: i.base } : {}) })),
      ctx.port.plan.createMr({ ...i.mr, project: p, sourceBranch: i.branch, targetBranch: i.base, removeSourceBranch: true }),
    ],
  };
}
