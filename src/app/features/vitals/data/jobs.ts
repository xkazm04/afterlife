// The collect jobs of this server process, one per project slug. A cold collect of a real project takes minutes (about
// 5 s per az call), so Refresh never waits for it on the request path: it starts the job here and answers at once, and
// the page reads the job back on each render until it is done. In-process only: a restart forgets them, and nothing is
// lost, because the collector's files are the record. Kept on globalThis so a dev reload of this module keeps them.
import type { CollectResult } from '@/server/vitals';
import { messageOf } from '@/lib/format/error';
import type { CollectJob } from '../model/types';

const KEY = Symbol.for('belay.vitals.collectJobs');
const holder = globalThis as unknown as Record<symbol, Map<string, CollectJob> | undefined>;
const jobs = (): Map<string, CollectJob> => (holder[KEY] ??= new Map());

/** The slug's job as it stands (a copy), or undefined when none ran since this server started. */
export function jobOf(slug: string): CollectJob | undefined {
  const j = jobs().get(slug);
  return j ? { ...j } : undefined;
}

/**
 * Starts `collect` for the slug unless a job for it is still running (that one is returned instead), and returns at
 * once. When it settles the job records when, and what it added or why it failed. Never throws.
 */
export function startCollect(slug: string, collect: (slug: string) => Promise<CollectResult>, now: () => Date = () => new Date()): CollectJob {
  const running = jobs().get(slug);
  if (running && !running.done) return { ...running };
  const job: CollectJob = { startedAt: now().toISOString() };
  jobs().set(slug, job);
  void Promise.resolve()
    .then(() => collect(slug))
    .then(
      (r) => {
        const done: CollectJob = { startedAt: job.startedAt, done: now().toISOString(), added: r.ci.added, total: r.ci.total, probes: r.probes };
        if (r.prod) done.prodAdded = r.prod.added;
        jobs().set(slug, done);
      },
      (e: unknown) => jobs().set(slug, { startedAt: job.startedAt, done: now().toISOString(), error: messageOf(e) }),
    );
  return { ...job };
}

/** Tests: forget every job. */
export function clearJobs(): void {
  jobs().clear();
}
