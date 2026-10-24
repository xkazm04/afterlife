// The runner's desk for Fleet and Needs-you: the fleet file, the run files and git's word on each mergeable wave's
// branch, folded by @/lib/runs/desk. Real local data in demo and live alike, like /runs. Git is asked only for waves
// that ended mergeable, in repos the fleet file gives a path for, all at once (branchState keeps each answer briefly).
import 'server-only';
import { branchKey, buildDesk } from '@/lib/runs/desk/desk';
import type { BranchState, RunnerDesk } from '@/lib/runs/desk/types';
import type { RunsData } from '@/lib/runs/types';
import { branchState } from './branchState';
import { readFleet } from './readFleet';
import { defaultRunsRoot, readRuns } from './readRuns';

export type AskGit = (path: string, branch: string, base: string) => Promise<BranchState | undefined>;

/** The desk, and the run files it was folded from (so a page that shows both reads them once). */
export async function readDeskAndRuns(root: string = defaultRunsRoot(), ask: AskGit = branchState): Promise<{ desk: RunnerDesk; runs: RunsData }> {
  const runs = readRuns(root);
  const fleet = readFleet(root);
  const asks: Promise<[string, BranchState | undefined]>[] = [];
  for (const repo of runs.repos) {
    const ref = fleet.refs.find((r) => r.slug === repo.repo);
    if (!ref) continue;
    for (const w of repo.waves) {
      if (!w.mergeable || !w.branch) continue;
      const key = branchKey(repo.repo, w.branch);
      asks.push(ask(ref.path, w.branch, ref.base).then((s) => [key, s]));
    }
  }
  const branches = new Map<string, BranchState>();
  for (const [key, s] of await Promise.all(asks)) if (s) branches.set(key, s);
  return { desk: buildDesk({ runs, fleet, branches }), runs };
}

export async function readDesk(root?: string, ask?: AskGit): Promise<RunnerDesk> {
  return (await readDeskAndRuns(root, ask)).desk;
}
