// The server reads the pre-run panel is drawn from, and the start-run plan checks again: the repos `belay run` may work
// (the runner's own strict loader, runner/fleet/load.ts, on the file the spawned CLI will read) and each repo's local
// branches (git.ts). The hosted replay has no fleet and reads nothing. Kept a few seconds, so /theater's renders and a
// preview right after share one read.
import 'server-only';
import path from 'node:path';
import { loadFleet } from '../../../../../runner/fleet/load';
import { branchesAt } from './git';
import type { RunBranches, StartData, StartRepo } from './types';

export const REPLAY_CLOSED = 'the hosted replay starts no run: it has no fleet and no machine of yours';

/** The fleet file `node cli/belay.mjs run` reads by default when spawned from the Afterlife checkout (`cwd`). */
export const fleetFileOf = (afterlife: string): string => path.join(afterlife, '.belay', 'fleet.yml');

export type ReposRead = { ok: true; repos: StartRepo[] } | { ok: false; reason: string };

/** Every fleet repo, as the runner loads it (fleet.yml, then saved projects with a runner block), or why none. */
export function runRepos(afterlife: string = process.cwd()): ReposRead {
  try {
    const repos = loadFleet(fleetFileOf(afterlife), { warn: () => {} }).map((r): StartRepo => ({
      slug: r.slug, path: r.path, base: r.base,
      ...(r.laneCapUsd !== undefined ? { laneCapUsd: r.laneCapUsd } : {}),
      ...(r.waveCapUsd !== undefined ? { waveCapUsd: r.waveCapUsd } : {}),
    }));
    return { ok: true, repos };
  } catch (e) {
    const m = e instanceof Error ? e.message.split('\n')[0] ?? '' : String(e);
    return { ok: false, reason: /ENOENT/.test(m) ? `no fleet file at ${fleetFileOf(afterlife)} and no saved project with a runner block` : m };
  }
}

/** One fleet repo's local branches (each with where it is checked out) and its checkout's HEAD branch. */
export async function listRunBranches(slug: string, afterlife: string = process.cwd()): Promise<RunBranches> {
  const read = runRepos(afterlife);
  if (!read.ok) return { ok: false, reason: read.reason };
  const repo = read.repos.find((r) => r.slug === slug);
  return repo ? branchesAt(repo.path) : { ok: false, reason: `${slug} is not a fleet repo` };
}

export const START_TTL_MS = 5_000;
let kept: { at: number; key: string; data: Promise<StartData> } | null = null;

async function read(afterlife: string): Promise<StartData> {
  const r = runRepos(afterlife);
  if (!r.ok) return { repos: [], branches: {}, fleetError: r.reason };
  const answers = await Promise.all(r.repos.map(async (repo) => [repo.slug, await branchesAt(repo.path)] as const));
  return { repos: r.repos, branches: Object.fromEntries(answers) };
}

/** The panel's data. Replay: closed, nothing read. One read per START_TTL_MS; concurrent renders share the read in flight. */
export function loadStartData(env: Record<string, string | undefined> = process.env, afterlife: string = process.cwd(), now: number = Date.now()): Promise<StartData> {
  if (env.BELAY_MODE === 'replay') return Promise.resolve({ repos: [], branches: {}, closed: REPLAY_CLOSED });
  if (kept && kept.key === afterlife && now - kept.at < START_TTL_MS) return kept.data;
  const data = read(afterlife);
  kept = { at: now, key: afterlife, data };
  return data;
}
