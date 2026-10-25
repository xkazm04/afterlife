// An Azure Pipelines file read into the jobs the rules credit. Pure: the caller opens files. `template:` references inside
// the repository are followed (a stage, job or steps template, and `extends:`), relative to the file that names them as
// Azure resolves them; one in another repository (`x.yml@alias`) is unresolved, since a job may come from it.
import path from 'node:path';
import { isRecord } from '../../core/types';
import type { CiJob } from '../facts';
import { aliasesOf, items, type Open, type Read } from './shared';

const SHELLS = ['script', 'bash', 'pwsh', 'powershell'] as const;
/** The inputs of a task that hold a script it runs (AzureCLI@2 inlineScript, PowerShell@2 script, AzurePowerShell Inline). */
const INLINE = ['script', 'inlineScript', 'Inline'] as const;
const MAX_DEPTH = 10;

interface Ctx {
  open: Open;
  out: Read;
  /** Every template file opened, so the caller does not read it again as a pipeline of its own. */
  templates: Set<string>;
}

/** A template reference as a checkout path, or null when it lives in another repository. */
function resolve(from: string, ref: string): string | null {
  const [file, repo] = ref.split('@');
  if (!file || (repo !== undefined && repo !== 'self')) return null;
  return file.startsWith('/') ? file.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), file));
}

function template(ref: string, from: string, c: Ctx, depth: number): { doc: Record<string, unknown>; file: string } | null {
  const file = resolve(from, ref);
  let doc: unknown;
  try {
    doc = file !== null && depth < MAX_DEPTH ? c.open(file) : undefined;
  } catch {
    doc = undefined; // a template that does not parse is one reference not opened, not the whole file unread
  }
  if (file === null || !isRecord(doc)) {
    c.out.unresolved.push(`${from}: template ${ref}`);
    return null;
  }
  c.templates.add(file);
  return { doc, file };
}

type Steps = { script: string[]; tasks: string[] };

function steps(list: unknown, from: string, c: Ctx, depth: number, acc: Steps): Steps {
  for (const s of items(list)) {
    if (!isRecord(s)) continue;
    if (typeof s.template === 'string') {
      const t = template(s.template, from, c, depth);
      if (t) steps(t.doc.steps, t.file, c, depth + 1, acc);
      continue;
    }
    for (const k of SHELLS) if (typeof s[k] === 'string') acc.script.push(s[k]);
    if (typeof s.task === 'string') {
      const inputs = isRecord(s.inputs) ? s.inputs : {};
      acc.tasks.push(typeof inputs.Action === 'string' ? `${s.task} (${inputs.Action})` : s.task);
      for (const k of INLINE) if (typeof inputs[k] === 'string') acc.script.push(inputs[k]);
    }
  }
  return acc;
}

/** A deployment job's steps sit in its strategy (runOnce.deploy.steps, rolling.preDeploy.steps, on.failure.steps). */
const nested = (v: unknown): unknown[] =>
  !isRecord(v) ? [] : Object.entries(v).flatMap(([k, x]) => (k === 'steps' ? [x] : nested(x)));

function job(j: unknown, stage: string | null, from: string, c: Ctx, depth: number): void {
  if (!isRecord(j)) return;
  if (typeof j.template === 'string') {
    const t = template(j.template, from, c, depth);
    if (t) for (const x of items(t.doc.jobs)) job(x, stage, t.file, c, depth + 1);
    return;
  }
  const id = typeof j.job === 'string' ? j.job : typeof j.deployment === 'string' ? j.deployment : null;
  if (id === null) return;
  const acc: Steps = { script: [], tasks: [] };
  for (const list of [j.steps, ...nested(j.strategy)]) steps(list, from, c, depth, acc);
  c.out.jobs.push({
    name: id,
    stage,
    script: acc.script.join('\n'),
    junit: acc.tasks.some((t) => /^PublishTestResults@/i.test(t)),
    release: false,
    sbom: false,
    file: from,
    aliases: aliasesOf(id, j.displayName),
    tasks: acc.tasks,
  } satisfies CiJob);
}

function stageOf(s: unknown, from: string, c: Ctx, depth: number): void {
  if (!isRecord(s)) return;
  if (typeof s.template === 'string') {
    const t = template(s.template, from, c, depth);
    if (t) for (const x of items(t.doc.stages)) stageOf(x, t.file, c, depth + 1);
    return;
  }
  for (const j of items(s.jobs)) job(j, typeof s.stage === 'string' ? s.stage : null, from, c, depth);
}

function pipeline(d: Record<string, unknown>, from: string, c: Ctx, depth: number): void {
  if (isRecord(d.extends) && typeof d.extends.template === 'string') {
    const t = template(d.extends.template, from, c, depth);
    if (t) pipeline(t.doc, t.file, c, depth + 1);
  }
  for (const s of items(d.stages)) stageOf(s, from, c, depth);
  for (const j of items(d.jobs)) job(j, null, from, c, depth);
  // a pipeline of steps alone runs them as one job, which Azure names "Job"
  if (d.steps !== undefined) job({ job: 'Job', steps: d.steps }, null, from, c, depth);
}

/** True when the document is a pipeline (or a template of one) that holds jobs. */
export const isAzurePipeline = (d: unknown): d is Record<string, unknown> =>
  isRecord(d) && ['stages', 'jobs', 'steps', 'extends'].some((k) => d[k] !== undefined);

/** Reads one Azure Pipelines document. `templates` collects the template files it opened. */
export function readAzure(doc: Record<string, unknown>, file: string, open: Open, templates: Set<string>): Read {
  const out: Read = { jobs: [], unresolved: [] };
  pipeline(doc, file, { open, out, templates }, 0);
  return out;
}
