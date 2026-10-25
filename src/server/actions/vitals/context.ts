// What a project write plans and runs with: the saved project, the person's own CLIs (az, through providers' Exec),
// the clock, and where Afterlife itself lives (the installed skill names its checkout). Injected, so the tests run
// every write against a fake exec and a temp data dir, and nothing real is ever confirmed from a test.
import type { ProjectConfig } from '@/schemas/vitals';
import { loadProjects, saveProject } from '@/server/discover';
import { defaultExec } from '@/server/providers/exec';
import type { Exec } from '@/server/providers/types';
import type { CommandOutcome, PreviewCommand } from '../types';

export interface ProjectDeps {
  exec: Exec;
  now: () => Date;
  project: (slug: string) => ProjectConfig | undefined;
  save: (cfg: ProjectConfig) => string;
  /** The Afterlife checkout (the app root): the installed skill runs its cli/belay.mjs. */
  afterlife: string;
}

export function projectDeps(): ProjectDeps {
  return { exec: defaultExec, now: () => new Date(), project: (slug) => loadProjects().find((p) => p.slug === slug), save: saveProject, afterlife: process.cwd() };
}

/** A project write's plan: what the preview shows, and the run its confirm does (only after the digest matched). */
export interface ProjectPlan {
  title: string;
  summary: string;
  commands: PreviewCommand[];
  diff: string[];
  notes?: string[];
  /** Something the digest must cover besides the argv (the skill file's content hash). */
  digestExtra?: string;
  run: () => Promise<CommandOutcome[]>;
}

/** Refused while planning: the reason is the answer. */
export class ProjectRefused extends Error {}

/** One argv token as a person types it in either shell: quoted when it holds a space or a shell character. */
export const shellWord = (a: string): string => (/^[A-Za-z0-9_./:=@%+,-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
export const displayOf = (bin: string, argv: readonly string[]): string => [bin, ...argv.map(shellWord)].join(' ');

/** The first stderr line that is not an az WARNING, or the exit code. */
export const errorLine = (stderr: string, code: number): string =>
  stderr.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !/^WARNING:/i.test(l)) ?? `exited ${code}`;
