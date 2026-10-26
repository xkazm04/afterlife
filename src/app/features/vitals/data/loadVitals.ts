// The Vitals screens' server reads, one per slice of the screen stream (screen/slices.ts): the saved projects (discover's
// loadProjects) and each one's stored measurements (vitals' readCiRuns / readProd / readAdjustments, deployMarkers over
// the runs), folded by model/view.ts band by band. Read per request: a collect appends to these files while the screen
// is open.
import 'server-only';
import { loadProjects } from '@/server/discover';
import { deployMarkers, readAdjustments, readCiRuns, readProd } from '@/server/vitals';
import type { ProjectConfig } from '@/schemas/vitals';
import type { AdjustmentRow, ProjectRow, RunsCell, SignalRow, VitalsCi } from '../model/types';
import { adjustmentsFold, ciFold, configRow, prodFold, runsCell } from '../model/view';

/** /vitals's config slice: every saved project, from its config alone. */
export function loadVitalsConfig(): ProjectRow[] {
  return loadProjects().map(configRow);
}

/** /vitals's runs slice: per slug, what its stored CI runs say (how many, when last fetched). */
export function loadVitalsRuns(): Record<string, RunsCell> {
  return Object.fromEntries(loadProjects().map((cfg) => [cfg.slug, runsCell(readCiRuns(cfg.slug))]));
}

/** The saved project with this slug, or null (the page answers notFound). */
export function projectConfig(slug: string): ProjectConfig | null {
  return loadProjects().find((p) => p.slug === slug) ?? null;
}

export const loadCi = (cfg: ProjectConfig): VitalsCi => ciFold(cfg, readCiRuns(cfg.slug));

export const loadProd = (cfg: ProjectConfig, now: string): { production?: SignalRow[] } =>
  cfg.cloud.provider === 'none' ? {} : prodFold(cfg, readProd(cfg.slug), deployMarkers(readCiRuns(cfg.slug)), now);

export const loadAdjustments = (cfg: ProjectConfig): AdjustmentRow[] => adjustmentsFold(cfg, readAdjustments(cfg.slug));
