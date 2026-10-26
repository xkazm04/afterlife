// A project's config and its stored measurements, folded into what the two Vitals screens draw. Pure: the loader
// (data/loadVitals.ts) reads the files and the clock, this decides nothing about where they came from. Each band has its
// own fold, so the screen stream sends each as its own slice (screen/slices.ts); buildView is all of them at once.
import type { AdjustmentLine, CiRun, DeployMarker, Host, ProdPoint, ProjectConfig } from '@/schemas/vitals';
import { adjustmentRows, remeasureOf } from './adjustments';
import { deliveryRows } from './delivery';
import { newestFetch } from './freshness';
import { productionRows } from './production';
import type { AdjustmentRow, ProjectRow, ProjectSummary, RunsCell, SignalRow, VitalsCi, VitalsConfig, VitalsView } from './types';

/** "azure-devops · Grinex / Grinex Portal", "gitlab · group/app", or the kind alone. */
export function hostWords(h: Host): string {
  const where = h.path ?? [h.org, h.project].filter(Boolean).join(' / ');
  return where ? `${h.kind} · ${where}` : h.kind;
}

const cloudWords = (cfg: ProjectConfig): string =>
  cfg.cloud.provider === 'none' ? 'not connected' : cfg.cloud.resource ? `${cfg.cloud.provider} · ${cfg.cloud.resource.name}` : cfg.cloud.provider;

const ciWords = (cfg: ProjectConfig): string =>
  cfg.ci.provider === 'none' ? 'none' : `${cfg.ci.provider} · ${cfg.ci.pipelines.length} pipeline${cfg.ci.pipelines.length === 1 ? '' : 's'}`;

/** A /vitals row from the config alone (the list's config slice). */
export function configRow(cfg: ProjectConfig): ProjectRow {
  return { slug: cfg.slug, name: cfg.name, root: cfg.root, host: hostWords(cfg.host), ci: ciWords(cfg), cloud: cloudWords(cfg) };
}

/** What the stored runs say of a project: how many, and the newest fetch (omitted: nothing collected yet). */
export function runsCell(runs: readonly CiRun[]): RunsCell {
  const last = newestFetch(runs);
  return last ? { runsStored: runs.length, lastCollected: last } : { runsStored: runs.length };
}

export function summarize(cfg: ProjectConfig, runs: readonly CiRun[]): ProjectSummary {
  return { ...configRow(cfg), ...runsCell(runs) };
}

/** The project page's config part: what it is, where, and the cloud it reads. */
export function configView(cfg: ProjectConfig): VitalsConfig {
  const { slug, name, root, host, ci } = configRow(cfg);
  return { slug, name, root, host, ci, cloud: cfg.cloud };
}

/** Delivery: the variants from the stored runs, how many are stored and when they were last fetched. */
export function ciFold(cfg: ProjectConfig, runs: readonly CiRun[]): VitalsCi {
  return { ...runsCell(runs), delivery: deliveryRows(runs, cfg.ci) };
}

/** Production: the signals with the deploys marked; omitted when no cloud is connected. */
export function prodFold(cfg: ProjectConfig, prod: readonly ProdPoint[], markers: readonly DeployMarker[], now: string): { production?: SignalRow[] } {
  return cfg.cloud.provider === 'none' ? {} : { production: productionRows(prod, markers, Date.parse(now)) };
}

/** Adjustments: each claim beside Afterlife's measurements, and how it can be re-measured here. */
export function adjustmentsFold(cfg: ProjectConfig, lines: readonly AdjustmentLine[]): AdjustmentRow[] {
  return adjustmentRows(lines).map((row) => {
    const remeasure = remeasureOf(row.claim, cfg);
    return remeasure ? { ...row, remeasure } : row;
  });
}

export function buildView(
  cfg: ProjectConfig,
  runs: readonly CiRun[],
  prod: readonly ProdPoint[],
  lines: readonly AdjustmentLine[],
  markers: readonly DeployMarker[],
  now: string,
): VitalsView {
  return { ...configView(cfg), ...ciFold(cfg, runs), ...prodFold(cfg, prod, markers, now), adjustments: adjustmentsFold(cfg, lines), now };
}
