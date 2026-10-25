// The Vitals screens' server read: the saved projects (discover's loadProjects) and each one's stored measurements
// (vitals' readCiRuns / readProd / readAdjustments, deployMarkers over the runs), folded by model/view.ts. Read per
// request, after connection(): a collect appends to these files while the page is open.
import 'server-only';
import { loadProjects } from '@/server/discover';
import { deployMarkers, readAdjustments, readCiRuns, readProd } from '@/server/vitals';
import type { ProjectSummary, VitalsView } from '../model/types';
import { buildView, summarize } from '../model/view';
import { jobOf } from './jobs';

export function loadVitalsList(): ProjectSummary[] {
  return loadProjects().map((cfg) => summarize(cfg, readCiRuns(cfg.slug)));
}

/** The project's view, or null for a slug no saved project has (the page answers notFound). */
export function loadVitalsProject(slug: string, now: Date = new Date()): VitalsView | null {
  const cfg = loadProjects().find((p) => p.slug === slug);
  if (!cfg) return null;
  const runs = readCiRuns(slug);
  const view = buildView(cfg, runs, cfg.cloud.provider === 'none' ? [] : readProd(slug), readAdjustments(slug), deployMarkers(runs), now.toISOString());
  const job = jobOf(slug);
  return job ? { ...view, job } : view;
}
