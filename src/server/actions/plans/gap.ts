// Stage a maturity gap: a new branch with the gap's files (one commit each), then a draft MR. Nothing is merged; the MR
// is the proposal. A file is a new file's content from the screen, or a hunk applied to a file the project holds (never a whole
// existing file, F83); the preview shows either before the click.
import type { StageGapMr } from '../types';
import { ActionRefused, locate, type Plan, type PlanContext } from './context';
import { applyHunk } from './hunk';

const PREVIEW_LINES = 12;

export async function planGapMr(ctx: PlanContext, intent: StageGapMr): Promise<Plan> {
  const { project } = await locate(ctx, intent.project);
  const base = project.defaultBranch ?? 'main';
  if (intent.to <= intent.from) throw new ActionRefused(`gap ${intent.gap} would not raise ${intent.stage}: ${intent.from} -> ${intent.to}`);

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
      shown = [`+ ${f.path} (${lines.length} lines)`, ...lines.slice(0, PREVIEW_LINES).map((l) => `+ ${l}`), ...(lines.length > PREVIEW_LINES ? ['+ ...'] : [])];
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
