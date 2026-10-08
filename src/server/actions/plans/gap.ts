// Stage a maturity gap: a new branch with the gap's files (one commit each), then a draft MR. Nothing is merged; the MR
// is the proposal. A file is a new file's content from the screen, or a hunk applied to a file the project holds (never a whole
// existing file, F83); the preview shows either before the click.
import { isKind } from '@/server/gitlab/errors';
import type { GlProject } from '@/server/gitlab/types';
import type { StageGapMr } from '../types';
import { ActionRefused, COMMIT_ID, locate, type Plan, type PlanContext } from './context';
import { applyHunk } from './hunk';

/** The gap branch must not exist yet (F85, as arm's F38): a 404 is the only "absent", any other failure refuses. */
async function noBranch(ctx: PlanContext, project: Pick<GlProject, 'id' | 'pathWithNamespace'>, branch: string): Promise<void> {
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

export async function planGapMr(ctx: PlanContext, intent: StageGapMr): Promise<Plan> {
  const { project } = await locate(ctx, intent.project);
  const base = project.defaultBranch ?? 'main';
  if (intent.to <= intent.from) throw new ActionRefused(`gap ${intent.gap} would not raise ${intent.stage}: ${intent.from} -> ${intent.to}`);
  await noBranch(ctx, project, intent.branch);

  const commands = [];
  const diff: string[] = [];
  for (const [i, f] of intent.files.entries()) {
    const file = await ctx.port.getFile(project.id, f.path, base);
    let content: string;
    let shown: string[];
    if ('hunk' in f) {
      if (!file) throw new ActionRefused(`${f.path} does not exist on ${base}, so the hunk for it has nothing to be applied to`);
      content = applyHunk(f.path, file.content, f.hunk);
      shown = [`~ ${f.path} (hunk: +${f.hunk.filter((l) => l.startsWith('+')).length} lines)`, ...f.hunk.map((l) => (l.startsWith('+') ? `+ ${l.slice(1)}` : `  ${l.slice(1)}`))];
    } else {
      if (file) throw new ActionRefused(`${f.path} already exists on ${base}: a gap changes a file the project has only by a hunk, never by replacing its whole content`);
      content = f.content;
      const lines = content.split('\n');
      shown = [`+ ${f.path} (${lines.length} lines)`, ...lines.map((l) => `+ ${l}`)]; // every line: an included job file runs in the MR pipeline (F84)
    }
    commands.push(ctx.port.plan.commitFile({
      project: project.id, path: f.path, branch: intent.branch, content, action: file ? 'update' : 'create',
      ...(file?.lastCommitId ? { lastCommitId: file.lastCommitId } : {}),
      message: `Maturity gap ${intent.gap}: ${intent.title}\n\nOperator: ${ctx.operator}`, ...(i === 0 ? { startBranch: base } : {}),
    }));
    diff.push(...shown);
  }
  commands.push(ctx.port.plan.createMr({
    project: project.id, sourceBranch: intent.branch, targetBranch: base, labels: ['maturity::gap'],
    title: `Draft: Maturity gap ${intent.gap}: ${intent.title}`,
    description: `${intent.stage} R${intent.from} -> R${intent.to}. Prepared by Belay for ${ctx.operator}.${intent.workItem ? `\n\nRelated to #${intent.workItem}` : ''}`,
  }));
  return {
    title: `Open the draft MR for gap ${intent.gap}`,
    summary: `${intent.files.length} file(s) on a new branch of ${project.pathWithNamespace}, then a draft MR, as ${ctx.operator}. Nothing is merged.`,
    commands, diff,
  };
}
