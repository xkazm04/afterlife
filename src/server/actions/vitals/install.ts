// install-skill: the afterlife-report skill written into the project's own repo, at
// <root>/.claude/skills/afterlife-report/SKILL.md, with this Afterlife checkout's path, the project's slug and its
// variants filled in. The preview shows the whole file. The write happens only when the file is absent or is still
// byte-identical to a copy Afterlife installed (their sha-256s are kept in <data>/vitals/<slug>/skill-installs.json);
// a copy the repo edited is refused, never overwritten. Afterlife never commits it: it shows in the repo's git status.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ProjectConfig } from '@/schemas/vitals';
import { vitalsDir } from '@/server/vitals';
import type { CommandOutcome, InstallSkill } from '../types';
import { ProjectRefused, type ProjectDeps, type ProjectPlan } from './context';

export const SKILL_PATH = ['.claude', 'skills', 'afterlife-report', 'SKILL.md'] as const;
const sha = (s: string): string => createHash('sha256').update(s).digest('hex');
const fwd = (p: string): string => p.replace(/\\/g, '/');

const recordFile = (slug: string): string => path.join(vitalsDir(slug), 'skill-installs.json');
function installed(slug: string): string[] {
  try {
    const v: unknown = JSON.parse(readFileSync(recordFile(slug), 'utf8'));
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The skill as the project gets it: the repo's template with the command, the data folder and the variants filled in. */
export function renderSkill(cfg: ProjectConfig, afterlife: string, dataDir = process.env.BELAY_DATA_DIR): string {
  const template = readFileSync(path.join(afterlife, 'skills', 'afterlife-report', 'SKILL.md'), 'utf8');
  const command = `node "${fwd(path.join(afterlife, 'cli', 'belay.mjs'))}" report --project ${cfg.slug}`;
  const data = dataDir ? fwd(path.resolve(afterlife, dataDir)) : undefined;
  const note = data
    ? `\nThis Afterlife keeps its data in \`${data}\`: set it first, \`export BELAY_DATA_DIR='${data}'\` (POSIX) or \`$env:BELAY_DATA_DIR = '${data}'\` (PowerShell).\n`
    : '';
  const variants = cfg.ci.variants.map((v) => `\`${v.id}\``).join(', ') || 'none saved yet';
  return template.replaceAll('{{PROJECT}}', cfg.slug).replaceAll('{{COMMAND}}', command).replaceAll('{{DATA_NOTE}}', note).replaceAll('{{VARIANTS}}', variants);
}

export function planInstall(deps: ProjectDeps, intent: InstallSkill): ProjectPlan {
  const cfg = deps.project(intent.project);
  if (!cfg) throw new ProjectRefused(`no saved project has the slug ${intent.project}`);
  const target = path.join(cfg.root, ...SKILL_PATH);
  const content = renderSkill(cfg, deps.afterlife);
  const digest = sha(content);
  const existing = existsSync(target) ? readFileSync(target, 'utf8') : undefined;
  const same = existing === content;
  if (existing !== undefined && !same && !installed(cfg.slug).includes(sha(existing))) {
    throw new ProjectRefused(`the repo has its own edited copy at ${fwd(target)}: Afterlife leaves it alone (delete it to install a fresh one)`);
  }
  const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
  const display = `write ${fwd(target)} (${lines} lines, sha256 ${digest.slice(0, 12)})`;

  const run = async (): Promise<CommandOutcome[]> => {
    try {
      if (!same) {
        mkdirSync(path.dirname(target), { recursive: true });
        const tmp = `${target}.${process.pid}.tmp`;
        writeFileSync(tmp, content, 'utf8');
        renameSync(tmp, target);
      }
      const record = installed(cfg.slug);
      if (!record.includes(digest)) {
        mkdirSync(vitalsDir(cfg.slug), { recursive: true });
        writeFileSync(recordFile(cfg.slug), JSON.stringify([...record, digest]), 'utf8');
      }
      return [{ display, exit: 0, ok: true, simulated: false, made: same ? 'unchanged: already installed' : `wrote ${fwd(path.join(...SKILL_PATH))}` }];
    } catch (e) {
      return [{ display, exit: 1, ok: false, simulated: false, error: e instanceof Error ? e.message : String(e) }];
    }
  };

  return {
    title: `Install the afterlife-report skill into ${cfg.name}`,
    summary: same
      ? `Already installed and identical at ${fwd(target)}: confirming rewrites nothing.`
      : `Writes ${fwd(target)} so a dev agent there reports its adjustments with belay report. Afterlife does not commit it.`,
    commands: [{ display, argv: ['write', fwd(target), digest], risk: 'low' }],
    diff: same ? [] : content.replace(/\n$/, '').split('\n').map((l) => `+ ${l}`),
    notes: [
      existing === undefined ? 'The file is new: nothing in the repo is replaced.' : 'The file is Afterlife\'s earlier install, unedited: it is replaced as a whole.',
      'Nothing is committed or pushed: the file shows in the repo\'s git status for you to commit or ignore.',
    ],
    digestExtra: digest,
    run,
  };
}
