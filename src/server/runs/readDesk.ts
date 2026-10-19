// The runner's desk for Fleet and Needs-you: the fleet file, the run files and git's word on each mergeable wave's
// branch, folded by @/lib/runs/desk. Real local data in demo and live alike, like /runs. Git is asked only for waves
// that ended mergeable, in repos the fleet file gives a path for.
import 'server-only';
import { branchKey, buildDesk } from '@/lib/runs/desk/desk';
import type { BranchState, RunnerDesk } from '@/lib/runs/desk/types';
import { branchState } from './branchState';
import { readFleet } from './readFleet';
import { defaultRunsRoot, readRuns } from './readRuns';

export type AskGit = (path: string, branch: string, base: string) => BranchState | undefined;

export function readDesk(root: string = defaultRunsRoot(), ask: AskGit = branchState): RunnerDesk {
  const runs = readRuns(root);
  const fleet = readFleet(root);
  const branches = new Map<string, BranchState>();
  for (const repo of runs.repos) {
    const ref = fleet.refs.find((r) => r.slug === repo.repo);
    if (!ref) continue;
    for (const w of repo.waves) {
      if (!w.mergeable || !w.branch) continue;
      const s = ask(ref.path, w.branch, ref.base);
      if (s) branches.set(branchKey(repo.repo, w.branch), s);
    }
  }
  return buildDesk({ runs, fleet, branches });
}
