// A live maturity gap's draft MR from a fixed template (templates.ts): the server writes the files, never the client.
// A CI template adds GitLab's include lines to .gitlab-ci.yml between belay:gap markers (block.ts), with the file's
// last_commit_id as read; a file template adds one new file. Either is a branch MR (plans/mr/branchMr.ts) on
// belay/gap-<stage>-<to>: the branch is new or the plan refuses, and the draft MR is labelled maturity::gap. Nothing is merged.
import { ActionRefused, lastCommitOf, type Plan, type PlanContext } from '../plans/context';
import { branchMr, type BranchMrInput } from '../plans/mr/branchMr';
import { CI_FILE, targetOf, type Target } from '../arm/plan';
import type { ApplyGapTemplate } from '../types';
import { gapBlocker, holdsGapBlock, insertGapBlock } from './block';
import { templateFor, type CiTemplate, type FileTemplate } from './templates';

const rung = (r: number | null): string => (r === null ? 'R?' : `R${r}`);

type Change = { commit: BranchMrInput['commits'][number]; diff: string[] };

async function ciChange(ctx: PlanContext, t: Target, intent: ApplyGapTemplate, tpl: CiTemplate, message: string): Promise<Change> {
  const file = await ctx.port.getFile(t.project.id, CI_FILE, t.base);
  if (!file) throw new ActionRefused(`${t.project.pathWithNamespace} has no ${CI_FILE} on ${t.base}: the ${intent.template} gap adds include lines to a pipeline that exists`);
  const lastCommitId = lastCommitOf(file, CI_FILE);
  const b = { stage: intent.stage, id: intent.template, templates: tpl.templates };
  const blocker = gapBlocker(file.content, b);
  if (blocker) throw new ActionRefused(blocker);
  const ins = insertGapBlock(file.content, b);
  if (!ins.ok) throw new ActionRefused(ins.reason);
  if (!holdsGapBlock(ins.content, b)) throw new ActionRefused(`Belay could not add the ${intent.template} lines to ${CI_FILE} without breaking it: nothing is planned`);
  return {
    commit: { path: CI_FILE, content: ins.content, action: 'update', lastCommitId, message },
    diff: [`@@ ${CI_FILE} · after line ${ins.after}`, ...ins.added.map((l) => `+ ${l}`)],
  };
}

async function fileChange(ctx: PlanContext, t: Target, tpl: FileTemplate, message: string): Promise<Change> {
  if (await ctx.port.getFile(t.project.id, tpl.path, t.base)) {
    throw new ActionRefused(`${tpl.path} already exists on ${t.base}: Belay adds it only as a new file, never over one the project has`);
  }
  const lines = tpl.content.split('\n');
  return {
    commit: { path: tpl.path, content: tpl.content, action: 'create', message },
    diff: [`+ ${tpl.path} (${lines.length} lines)`, ...lines.map((l) => `+ ${l}`)],
  };
}

/** The draft MR for one live gap, from its template. Reads GitLab; writes nothing. */
export async function planGapTemplate(ctx: PlanContext, intent: ApplyGapTemplate): Promise<Plan> {
  const tpl = templateFor(intent.template, intent.stage, intent.to);
  if (typeof tpl === 'string') throw new ActionRefused(tpl);
  const t = await targetOf(ctx, intent.project, ctx.cfg.infra);
  const rungs = `${intent.stage} ${rung(intent.from)} -> R${intent.to}`;
  const title = `Draft: Maturity gap ${rungs}: ${tpl.title}`;
  const message = `Maturity gap ${rungs}: ${tpl.title}\n\nBelay-Gap: ${intent.stage} ${intent.template}\nOperator: ${ctx.operator}`;
  const change = tpl.kind === 'ci' ? await ciChange(ctx, t, intent, tpl, message) : await fileChange(ctx, t, tpl, message);
  const branch = `belay/gap-${intent.stage}-${intent.to}`;
  const from = intent.from === null ? 'its rung is unknown (the scan could not read it)' : `it is at R${intent.from}`;
  const mr = await branchMr(ctx, {
    project: t.project, base: t.base, branch, commits: [change.commit],
    mr: {
      labels: ['maturity::gap'], title,
      description: [
        `Prepared by Belay for ${ctx.operator}.`,
        `The maturity scan's next change for ${intent.stage} (${from}; this earns R${intent.to}): ${tpl.change}.`,
        'A person merges this; Belay never does.',
      ].join('\n\n'),
    },
  });
  return {
    title: `Open the draft MR for the ${intent.stage} gap`,
    summary: `One commit on a new branch ${branch} of ${t.project.pathWithNamespace} off ${t.base}, then a draft MR, as ${ctx.operator}. Nothing is merged.`,
    ...mr, diff: change.diff,
  };
}
