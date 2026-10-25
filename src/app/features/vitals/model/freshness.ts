// When to collect, and what a failed collect asks of the person. There is no daemon: opening a project whose newest
// stored run was fetched more than 15 minutes ago collects once, and Refresh collects on a click. Pure.
import type { CiRun, ProbeResult } from '@/schemas/vitals';
import type { CollectJob } from './types';

export const STALE_MS = 15 * 60_000;

/** The newest fetchedAt among the stored runs; undefined when none is stored. */
export function newestFetch(runs: readonly Pick<CiRun, 'fetchedAt'>[]): string | undefined {
  let best: string | undefined;
  for (const r of runs) if (!best || Date.parse(r.fetchedAt) > Date.parse(best)) best = r.fetchedAt;
  return best;
}

/** Never collected, or the last collect is older than STALE_MS. */
export function needsCollect(lastCollected: string | undefined, now: string): boolean {
  if (!lastCollected) return true;
  return Date.parse(now) - Date.parse(lastCollected) > STALE_MS;
}

/**
 * Opening the page starts a collect when the stored runs are stale, unless a job is already running, or one finished
 * within STALE_MS (a failed one, too: its reason shows, and Refresh retries it on a click, not every open).
 */
export function collectOnOpen(lastCollected: string | undefined, job: CollectJob | undefined, now: string): boolean {
  if (job && !job.done) return false;
  if (job?.done && Date.parse(now) - Date.parse(job.done) <= STALE_MS) return false;
  return needsCollect(lastCollected, now);
}

/** A job still running: the client re-reads the page this often until it is done. */
export const POLL_MS = 5_000;

const RELOGIN: readonly [RegExp, string][] = [
  [/\bglab auth login\b/, 'glab auth login'],
  [/\baz login\b/, 'az login'],
];
const BY_KIND: Partial<Record<ProbeResult['kind'], string>> = { 'az-login': 'az login', 'glab-auth': 'glab auth login' };

/** A lapsed login among the probes (or in a collect's error line): the command that renews it and the line that said so. */
export function loginExpired(probes: readonly ProbeResult[] = [], error?: string): { command: string; summary: string } | undefined {
  for (const p of probes) {
    if (p.status !== 'fail') continue;
    const named = RELOGIN.find(([re]) => re.test(p.summary))?.[1] ?? BY_KIND[p.kind];
    if (named) return { command: named, summary: p.summary };
  }
  const fromError = error ? RELOGIN.find(([re]) => re.test(error))?.[1] : undefined;
  return fromError && error ? { command: fromError, summary: error } : undefined;
}
