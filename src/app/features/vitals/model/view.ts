// A project's config and its stored measurements, folded into what the two Vitals screens draw. Pure: the loader
// (data/loadVitals.ts) reads the files and the clock, this decides nothing about where they came from.
import type { AdjustmentLine, CiRun, DeployMarker, Host, ProdPoint, ProjectConfig } from '@/schemas/vitals';
import { adjustmentRows } from './adjustments';
import { deliveryRows } from './delivery';
import { newestFetch } from './freshness';
import { productionRows } from './production';
import type { ProjectSummary, VitalsView } from './types';

/** "azure-devops · Grinex / Grinex Portal", "gitlab · group/app", or the kind alone. */
export function hostWords(h: Host): string {
  const where = h.path ?? [h.org, h.project].filter(Boolean).join(' / ');
  return where ? `${h.kind} · ${where}` : h.kind;
}

const cloudWords = (cfg: ProjectConfig): string =>
  cfg.cloud.provider === 'none' ? 'not connected' : cfg.cloud.resource ? `${cfg.cloud.provider} · ${cfg.cloud.resource.name}` : cfg.cloud.provider;

const ciWords = (cfg: ProjectConfig): string =>
  cfg.ci.provider === 'none' ? 'none' : `${cfg.ci.provider} · ${cfg.ci.pipelines.length} pipeline${cfg.ci.pipelines.length === 1 ? '' : 's'}`;

export function summarize(cfg: ProjectConfig, runs: readonly CiRun[]): ProjectSummary {
  const s: ProjectSummary = { slug: cfg.slug, name: cfg.name, root: cfg.root, host: hostWords(cfg.host), ci: ciWords(cfg), cloud: cloudWords(cfg), runsStored: runs.length };
  const last = newestFetch(runs);
  if (last) s.lastCollected = last;
  return s;
}

export function buildView(
  cfg: ProjectConfig,
  runs: readonly CiRun[],
  prod: readonly ProdPoint[],
  lines: readonly AdjustmentLine[],
  markers: readonly DeployMarker[],
  now: string,
): VitalsView {
  const s = summarize(cfg, runs);
  const view: VitalsView = {
    slug: s.slug,
    name: s.name,
    root: s.root,
    host: s.host,
    ci: s.ci,
    cloud: cfg.cloud,
    runsStored: s.runsStored,
    delivery: deliveryRows(runs, cfg.ci),
    adjustments: adjustmentRows(lines),
    now,
  };
  if (s.lastCollected) view.lastCollected = s.lastCollected;
  if (cfg.cloud.provider !== 'none') view.production = productionRows(prod, markers, Date.parse(now));
  return view;
}
