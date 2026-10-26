'use server';

// Refresh: starts one incremental collect of a real project (collectProject: CI runs newer than the newest stored, then
// prod points since the newest stored bin) as a background job (jobs.ts) and answers at once - a cold collect takes
// minutes - then the route renders again (`refresh` from next/cache) so the page shows the job; it re-reads until the job
// is done. It only reads the providers, through the person's own az / glab login, so like the live re-poll it answers
// only a request addressed to this machine (local.ts). The hosted replay (AFTERLIFE_MODE=replay) has no real project: it
// refuses, and a slug no saved project has is refused before anything runs. Once the runs are in, a claim whose queued
// runs (queue-runs) are now all stored is measured over exactly them (measureQueuedAll: method queued).
import { headers } from 'next/headers';
import { refresh } from 'next/cache';
import { notLocal } from '@/server/actions/local';
import { envOf } from '@/server/env/env';
import { loadProjects } from '@/server/discover';
import { collectProject, measureQueuedAll } from '@/server/vitals';
import { startCollect } from './jobs';
import type { RefreshResult } from '../model/types';

export async function refreshVitals(slug: unknown): Promise<RefreshResult> {
  if (envOf(process.env, 'MODE') === 'replay') return { ok: false, error: 'the hosted replay has no real project to collect' };
  if (typeof slug !== 'string' || !loadProjects().some((p) => p.slug === slug)) return { ok: false, error: 'no saved project has that slug' };
  const away = notLocal(await headers());
  if (away) return { ok: false, error: away };
  const job = startCollect(slug, collectAndMeasure);
  refresh();
  return { ok: true, job };
}

async function collectAndMeasure(slug: string) {
  const r = await collectProject(slug);
  measureQueuedAll(slug);
  return r;
}
