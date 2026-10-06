// Stage a maturity gap: a new branch with the gap's files (one commit each), then a draft MR. Nothing is merged; the MR
// is the proposal. The file contents come from the screen, so the preview shows them in full before the click.
import type { StageGapMr } from '../types';
import { ActionRefused, locate, type Plan, type PlanContext } from './context';

const PREVIEW_LINES = 12;

export async function planGapMr(ctx: PlanContext, intent: StageGapMr): Promise<Plan> {
  const { project } = await locate(ctx, intent.project);
  const base = project.defaultBranch ?? 'main';
  if (intent.to <= intent.from) throw new ActionRefused(`gap ${intent.gap} would not raise ${intent.stage}: ${intent.from} -> ${intent.to}`);

  const commands = [];
  const diff: string[] = [];
  for (const [i, f] of intent.files.entries()) {
    const exists = (await ctx.port.getFile(project.id, f.path, base)) !== null;
    commands.push(ctx.port.plan.commitFile({
      project: project.id, path: f.path, branch: intent.branch, content: f.content, action: exists ? 'update' : 'create',
      message: `Maturity gap ${intent.gap}: ${intent.title}\n\nOperator: ${ctx.operator}`, ...(i === 0 ? { startBranch: base } : {}),
    }));
    const lines = f.content.split('\n');
    diff.push(`${exists ? '~' : '+'} ${f.path} (${lines.length} lines)`, ...lines.slice(0, PREVIEW_LINES).map((l) => `+ ${l}`), ...(lines.length > PREVIEW_LINES ? ['+ ...'] : []));
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
