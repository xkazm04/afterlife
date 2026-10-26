// A start-run's plan: the checks a run must pass before it may spend, then the one command and its launch. Planned at
// preview and again at confirm (run.ts), so a run that started meanwhile, or a branch checked out since, refuses the
// confirm too. Every effect is injected (deps), so the tests run against a temp git repo and a fake launch.
import path from 'node:path';
import type { CommandOutcome, PreviewCommand } from '../../types';
import { nodeArgv, runDisplay, runNotes } from './command';
import type { ReposRead } from './read';
import type { RunBranches, StartRun } from './types';

export interface StartDeps {
  now: () => Date;
  /** The Afterlife checkout: the CLI runs from it (`node cli/belay.mjs`), and it holds the fleet file. */
  afterlife: string;
  /** Where the runs live (<data>/runs/<slug>/): the launch log is written beside the waves. */
  dataDir: string;
  repos: () => ReposRead;
  /** Whether the repo's checkout is on this disk: the runner refuses a fleet path that is not. */
  exists: (repoPath: string) => boolean;
  branches: (repoPath: string) => Promise<RunBranches>;
  /** A live `afterlife run`'s pid on that repo (its afterlife-run.pid, or a pre-rename belay-run.pid), or null. */
  liveRun: (repoPath: string) => number | null;
  /** Spawns `node <argv>` detached from `cwd`, stdout and stderr to `log`; resolves once it has a pid. */
  launch: (argv: string[], cwd: string, log: string) => Promise<{ pid: number }>;
}

/** Refused while planning: the reason is the answer, and nothing ran. */
export class StartRefused extends Error {}

export interface StartPlan {
  title: string;
  summary: string;
  commands: PreviewCommand[];
  notes: string[];
  run: () => Promise<CommandOutcome[]>;
}

/** `2026-10-25T10:00:00.000Z` -> `20261025-100000`: a log name that sorts and is valid on every file system. */
const stamp = (d: Date): string => d.toISOString().replace(/\.\d+Z$/, '').replace(/[-:]/g, '').replace('T', '-');

export async function planStartRun(deps: StartDeps, i: StartRun): Promise<StartPlan> {
  const read = deps.repos();
  if (!read.ok) throw new StartRefused(`the fleet cannot be read: ${read.reason}`);
  const repo = read.repos.find((r) => r.slug === i.repo);
  if (!repo) throw new StartRefused(`${i.repo} is not a fleet repo (.afterlife/fleet.yml or a saved project with a runner block)`);
  if (!deps.exists(repo.path)) throw new StartRefused(`${repo.slug}'s checkout is not on this machine: ${repo.path} does not exist`);
  const pid = deps.liveRun(repo.path);
  if (pid !== null) throw new StartRefused(`an afterlife run (pid ${pid}) is running on ${repo.slug} now; it holds ${path.join(repo.path, '.claude', 'worktrees')}: wait for it to end`);
  if (i.mode === 'execute' && i.onto !== undefined) {
    const b = await deps.branches(repo.path);
    if (!b.ok) throw new StartRefused(`the branches of ${repo.slug} cannot be read: ${b.reason}`);
    const onto = b.branches.find((x) => x.name === i.onto);
    if (!onto) throw new StartRefused(`${i.onto} is not a local branch of ${repo.slug}`);
    if (onto.checkedOutAt) throw new StartRefused(`${i.onto} is checked out at ${onto.checkedOutAt}: lanes cannot land on a branch a worktree holds; switch that checkout away first`);
  }
  const argv = nodeArgv(i);
  const display = runDisplay(i);
  const logDir = path.join(deps.dataDir, 'runs', repo.slug);
  const notes = [
    ...runNotes(i, repo),
    `Starts detached from ${deps.afterlife} as node ${argv[0]} …; its output goes to ${path.join(logDir, 'launch-<time>.log')}. The page returns at once and the live film follows the run.`,
  ];
  return {
    title: `${i.mode === 'propose' ? 'Propose' : 'Run'} · ${repo.slug}`,
    summary: i.mode === 'propose' ? 'Plans the lanes and changes nothing.' : 'Lanes edit, run the gates and commit what passes.',
    commands: [{ display, argv, risk: i.mode === 'propose' ? 'low' : i.onto !== undefined ? 'merge' : 'policy' }],
    notes,
    run: async () => {
      const log = path.join(logDir, `launch-${stamp(deps.now())}.log`);
      const { pid } = await deps.launch(argv, deps.afterlife, log);
      return [{ display, exit: 0, ok: true, simulated: false, made: `pid ${pid}` }];
    },
  };
}
