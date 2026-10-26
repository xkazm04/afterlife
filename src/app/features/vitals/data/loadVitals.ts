// The Vitals screens' server reads, one per slice of the screen stream (screen/slices.ts): the saved projects (discover's
// loadProjects) and each one's stored measurements (vitals' readCiRuns / readProd / readAdjustments, deployMarkers over
// the runs), folded by model/view.ts band by band. Read per request: a collect appends to these files while the screen
// is open. `demo` (the demo estate is on) adds the demo projects after the saved ones (model/demo/estate.ts); theirs
// are generated from the clock (model/demo), never read from disk.
import 'server-only';
import { loadProjects } from '@/server/discover';
import { deployMarkers, readAdjustments, readCiRuns, readProd } from '@/server/vitals';
import type { AdjustmentLine, CiRun, ProdPoint } from '@/schemas/vitals';
import { demoRuns } from '../model/demo/ci';
import { demoClock, shownProject, shownProjects, withoutRemeasure, type Shown } from '../model/demo/estate';
import { demoAdjustments, demoProd } from '../model/demo/signals';
import type { AdjustmentRow, ProjectRow, RunsCell, SignalRow, VitalsCi, VitalsConfig } from '../model/types';
import { adjustmentsFold, ciFold, configRow, configView, prodFold, runsCell } from '../model/view';

export type { Shown };

const runsOf = ({ cfg, demo }: Shown): CiRun[] => (demo ? demoRuns(cfg, demoClock(Date.now())) : readCiRuns(cfg.slug));
const prodOf = ({ cfg, demo }: Shown): ProdPoint[] => (demo ? demoProd(cfg, demoClock(Date.now())) : readProd(cfg.slug));
const linesOf = ({ cfg, demo }: Shown): AdjustmentLine[] => (demo ? demoAdjustments(cfg, demoClock(Date.now())) : readAdjustments(cfg.slug));

/** /vitals's config slice: every saved project from its config alone, then the demo ones (marked) while demo is on. */
export function loadVitalsConfig(demo = false): ProjectRow[] {
  return shownProjects(loadProjects(), demo).map((p) => (p.demo ? { ...configRow(p.cfg), demo: true } : configRow(p.cfg)));
}

/** /vitals's runs slice: per slug, what its stored CI runs say (how many, when last fetched). */
export function loadVitalsRuns(demo = false): Record<string, RunsCell> {
  return Object.fromEntries(shownProjects(loadProjects(), demo).map((p) => [p.cfg.slug, runsCell(runsOf(p))]));
}

/** The shown project with this slug (saved, or demo while it is on), or null (the page answers notFound). */
export function projectConfig(slug: string, demo = false): Shown | null {
  return shownProject(loadProjects(), demo, slug);
}

export const loadConfig = (p: Shown): VitalsConfig => (p.demo ? { ...configView(p.cfg), demo: true } : configView(p.cfg));

export const loadCi = (p: Shown): VitalsCi => ciFold(p.cfg, runsOf(p));

export const loadProd = (p: Shown, now: string): { production?: SignalRow[] } =>
  p.cfg.cloud.provider === 'none' ? {} : prodFold(p.cfg, prodOf(p), deployMarkers(runsOf(p)), now);

export const loadAdjustments = (p: Shown): AdjustmentRow[] => {
  const rows = adjustmentsFold(p.cfg, linesOf(p));
  return p.demo ? withoutRemeasure(rows) : rows;
};
