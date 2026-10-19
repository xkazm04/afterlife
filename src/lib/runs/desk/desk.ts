// The runner's desk, folded from three reads the server does (the fleet file, the run files, git's word on each wave
// branch): one row per repo for Fleet, and the decisions for Needs-you. Pure; nothing here reads or writes.
//
// A mergeable wave is a decision while its branch exists and is not in its base yet (waves of one run stack, so taking
// the newest also takes the ones under it, and those then read merged). A parked lane is a decision while it sits in
// its repo's newest ended wave: the next wave's plan sees it in the history, so an older park has had its answer.
import type { RunsData, RunWave } from '../types';
import type { BranchState, FleetFile, FleetRef, MergeNeed, ParkNeed, RunnerDesk, RunnerNeed, RunnerRow } from './types';

export const branchKey = (repo: string, branch: string): string => `${repo}\u0000${branch}`;

const quote = (p: string): string => (/[\s"']/.test(p) ? `"${p.replace(/"/g, '\\"')}"` : p);

/** The commands a person runs to take a wave: on the base, fast-forward only, then push. Text only. */
export function mergeCommands(where: string, branch: string, base: string): string[] {
  const at = `git -C ${quote(where)}`;
  return [`${at} switch ${base}`, `${at} merge --ff-only ${branch}`, `${at} push`];
}

function mergeNeed(w: RunWave, ref: FleetRef | undefined, state: BranchState | undefined): MergeNeed | null {
  if (!w.mergeable || !w.branch) return null;
  if (state && (!state.exists || state.merged)) return null;
  const base = ref?.base ?? 'main';
  return {
    kind: 'merge-wave',
    id: `merge:${w.repo}:${w.wave}`,
    repo: w.repo,
    wave: w.wave,
    branch: w.branch,
    base,
    ...(ref ? { path: ref.path } : {}),
    landed: w.counts.landed,
    ...(w.costUsd !== undefined ? { costUsd: w.costUsd } : {}),
    checked: state !== undefined,
    commands: mergeCommands(ref?.path ?? w.repo, w.branch, base),
  };
}

function parkNeeds(waves: readonly RunWave[]): ParkNeed[] {
  const last = waves.find((w) => !w.running);
  if (!last) return [];
  return last.lanes
    .filter((l) => l.outcome === 'parked')
    .map((l) => ({
      kind: 'parked-lane' as const,
      id: `park:${last.repo}:${last.wave}:${l.lane}`,
      repo: last.repo,
      wave: last.wave,
      lane: l.lane,
      ...(l.title !== undefined ? { title: l.title } : {}),
      ...(l.parkReason !== undefined ? { parkReason: l.parkReason } : {}),
    }));
}

export interface DeskInput {
  runs: RunsData;
  fleet: { file: FleetFile; refs: readonly FleetRef[]; error?: string };
  /** By branchKey(repo, branch); a missing entry is "git was not asked or could not say". */
  branches: ReadonlyMap<string, BranchState>;
}

export function buildDesk({ runs, fleet, branches }: DeskInput): RunnerDesk {
  const refs = new Map(fleet.refs.map((r) => [r.slug, r]));
  const slugs = [...fleet.refs.map((r) => r.slug), ...runs.repos.map((r) => r.repo).filter((s) => !refs.has(s))];
  const needs: RunnerNeed[] = [];
  const rows = slugs.map((slug): RunnerRow => {
    const ref = refs.get(slug);
    const repo = runs.repos.find((r) => r.repo === slug);
    const waves = repo?.waves ?? [];
    const merges = waves.flatMap((w) => mergeNeed(w, ref, w.branch ? branches.get(branchKey(slug, w.branch)) : undefined) ?? []);
    const mine = [...merges, ...parkNeeds(waves)];
    needs.push(...mine);
    const w = waves[0];
    const state = w?.branch ? branches.get(branchKey(slug, w.branch)) : undefined;
    return {
      slug,
      ...(ref ? { path: ref.path, base: ref.base } : {}),
      inFleet: ref !== undefined,
      waves: waves.length,
      ...(w
        ? {
            last: {
              wave: w.wave,
              running: w.running,
              ...(w.mergeable !== undefined ? { mergeable: w.mergeable } : {}),
              ...(state?.exists ? { merged: state.merged } : {}),
              counts: w.counts,
              open: w.open,
              ...(w.endedAt !== undefined ? { endedAt: w.endedAt } : {}),
            },
          }
        : {}),
      ...(repo?.totals.tokens !== undefined ? { tokens: repo.totals.tokens } : {}),
      ...(repo?.totals.costUsd !== undefined ? { costUsd: repo.totals.costUsd } : {}),
      needs: mine.length,
    };
  });
  return { fleet: fleet.file, ...(fleet.error ? { fleetError: fleet.error } : {}), rows, needs };
}
