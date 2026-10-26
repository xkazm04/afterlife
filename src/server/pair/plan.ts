// `afterlife pair`: what the bootstrap adds to a checkout. Pure: the caller reads the files and writes the plan. Every
// action only adds: a new file, appended lines, one inserted include line. A file Afterlife would have to change is kept
// as it is, and the operator is told what to add.
import { CI_FILE, componentsCi, eolOf, wireCi, type PackRef } from './ciFile';

export const AGENT_CONFIG = '.gitlab/duo/agent-config.yml';
// wire names: the CI jobs' work folders (.belay/ inside a job, the fetched engine and policy), as targets ignore them
const IGNORE = ['.belay-engine/', '.belay-policy/', '.belay/', 'evidence/'];

export type PairOp = 'create' | 'append' | 'insert' | 'keep' | 'refuse';

export interface PairAction {
  path: string;
  op: PairOp;
  /** The whole file after the action (create, append, insert). */
  text?: string;
  /** The lines this action adds, as the operator should read them. */
  added: string[];
  why: string;
}

export interface PairPlan {
  actions: PairAction[];
  /** True when nothing would be written: the checkout is paired already. */
  paired: boolean;
  /** True when an action was refused: the operator must finish by hand. */
  partial: boolean;
}

const linesOf = (t: string): string[] => t.split('\n').filter((l, i, a) => !(i === a.length - 1 && l === ''));

/** `read(path)` is the checkout's file, or null when it does not exist. */
export function planPair(read: (path: string) => string | null, ref: PackRef, agentConfig: string): PairPlan {
  const actions: PairAction[] = [];

  const ci = componentsCi(ref);
  const have = read(CI_FILE);
  if (have === null) actions.push({ path: CI_FILE, op: 'create', text: ci, added: linesOf(ci), why: 'the Afterlife components, pinned to the pack' });
  else if (have === ci) actions.push({ path: CI_FILE, op: 'keep', added: [], why: 'already the Afterlife components' });
  else actions.push({ path: CI_FILE, op: 'refuse', added: [], why: 'exists and differs: kept as it is (compare it with `afterlife pair` output, or remove it to re-pair)' });

  const wire = wireCi(read('.gitlab-ci.yml'));
  if (wire.op === 'keep') actions.push({ path: '.gitlab-ci.yml', op: 'keep', added: [], why: 'already includes the Afterlife file' });
  else if (wire.op === 'refuse') actions.push({ path: '.gitlab-ci.yml', op: 'refuse', added: [], why: wire.why });
  else actions.push({ path: '.gitlab-ci.yml', op: wire.op, text: wire.text, added: [`- local: ${CI_FILE}`], why: 'one include line; nothing else changes' });

  const agent = read(AGENT_CONFIG);
  if (agent === null) actions.push({ path: AGENT_CONFIG, op: 'create', text: agentConfig, added: linesOf(agentConfig), why: 'how the custom flows run (read from the default branch only)' });
  else actions.push({ path: AGENT_CONFIG, op: 'keep', added: [], why: agent === agentConfig ? 'already the Afterlife template' : 'yours is kept as it is' });

  const ignore = read('.gitignore');
  const missing = IGNORE.filter((l) => !(ignore ?? '').split('\n').some((x) => x.trim() === l));
  if (missing.length === 0) actions.push({ path: '.gitignore', op: 'keep', added: [], why: 'already ignores the Afterlife work folders' });
  else {
    const base = ignore ?? '';
    const eol = eolOf(base);
    const text = `${base}${base === '' || base.endsWith('\n') ? '' : eol}${base === '' ? '' : eol}# Afterlife work folders (never committed)${eol}${missing.join(eol)}${eol}`;
    actions.push({ path: '.gitignore', op: ignore === null ? 'create' : 'append', text, added: missing, why: 'Afterlife work folders stay out of git' });
  }

  return {
    actions,
    paired: actions.every((a) => a.op === 'keep'),
    partial: actions.some((a) => a.op === 'refuse'),
  };
}

/** The plan as the operator reads it before anything is written. */
export function describePlan(p: PairPlan, written: boolean): string {
  const out: string[] = [];
  for (const a of p.actions) {
    out.push(`${a.op.padEnd(7)} ${a.path}  (${a.why})`);
    for (const l of a.added.slice(0, 14)) out.push(`        + ${l}`);
    if (a.added.length > 14) out.push(`        + … ${a.added.length - 14} more lines`);
  }
  if (p.paired) out.push('', 'already paired: nothing to write.');
  else if (!written) out.push('', 'nothing was written. Run again with --write to add these, as you, in this checkout.');
  if (p.partial) out.push('', 'some files were kept as they are: finish those by hand (see above).');
  return out.join('\n');
}
