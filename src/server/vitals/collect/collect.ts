// Incremental CI collection for one project: runs newer than the newest stored, classified by the project's variant
// rules, appended once each. A run still in flight is not stored (a stored run is never rewritten), and neither is
// any finished run newer than it, so the next collect's `sinceRunId` cannot step past it. A provider failure comes
// back as a `fail` probe, never a throw.
import type { CiProvider } from '@/server/providers/types';
import type { CiRun, ProbeResult, ProjectConfig } from '@/schemas/vitals';
import { loadProjects } from '@/server/discover';
import { ProviderError, probeResult } from '@/server/providers/probeResult';
import { ciProvider, cloudProvider } from '@/server/providers/registry';
import { collectProd } from '../prod';
import { appendCiRuns, appendProd, readCiRuns, readProd } from '../store';
import { classifyVariant } from '../variants';
import type { CollectResult } from '../index';

/** A run "in flight" for longer than this is stuck in a queue; it stops holding the others back. */
export const HOLD_MAX_MS = 24 * 3_600_000;

/** The newest stored run id of this provider, as the provider's `sinceRunId`. */
export function newestRunId(runs: CiRun[], provider: CiRun['provider']): string | undefined {
  let max: number | undefined;
  for (const r of runs) if (r.provider === provider && /^\d+$/.test(r.runId)) max = Math.max(max ?? 0, Number(r.runId));
  return max === undefined ? undefined : String(max);
}

/** The finished runs that may be stored now: those older than every run still in flight (stuck ones excepted). */
export function storable(runs: CiRun[], now: number): CiRun[] {
  const flying = runs.filter((r) => r.result === 'running' && now - Date.parse(r.startedAt) < HOLD_MAX_MS).map((r) => Number(r.runId));
  const ceiling = flying.length ? Math.min(...flying) : Infinity;
  return runs.filter((r) => r.result !== 'running' && Number(r.runId) < ceiling);
}

function failProbe(cfg: ProjectConfig, err: unknown, t0: number): ProbeResult {
  if (err instanceof ProviderError) return err.probe;
  const kind = cfg.ci.provider === 'gitlab-ci' ? 'glab-pipelines' : 'az-devops-runs';
  return probeResult({ kind, args: {} }, t0, 'fail', err instanceof Error ? err.message : String(err));
}

export async function collectWith(cfg: ProjectConfig, provider: CiProvider | undefined, now: number = Date.now()): Promise<CollectResult> {
  const t0 = Date.now();
  const stored = readCiRuns(cfg.slug);
  if (!provider || cfg.ci.provider === 'none') return { slug: cfg.slug, ci: { added: 0, total: stored.length }, probes: [] };
  let runs: CiRun[];
  try {
    runs = await provider.listRuns(cfg, { sinceRunId: newestRunId(stored, provider.kind) });
  } catch (err) {
    return { slug: cfg.slug, ci: { added: 0, total: stored.length }, probes: [failProbe(cfg, err, t0)] };
  }
  const classified = storable(runs, now)
    .sort((a, b) => Number(a.runId) - Number(b.runId))
    .map((r) => {
      const variant = classifyVariant(r, cfg.ci.variants);
      return variant ? { ...r, variant } : r;
    });
  const added = appendCiRuns(cfg.slug, classified);
  return { slug: cfg.slug, ci: { added, total: readCiRuns(cfg.slug).length }, probes: [] };
}

/** Incremental: CI runs newer than the newest stored, then prod points from the newest stored bin. Throws only for an
 * unknown slug. A cloud that is not connected comes back as a skipped probe (collectProd never calls the provider). */
export async function collectProject(slug: string): Promise<CollectResult> {
  const cfg = loadProjects().find((p) => p.slug === slug);
  if (!cfg) throw new Error(`no onboarded project "${slug}"`);
  const ci = await collectWith(cfg, cfg.ci.provider === 'none' ? undefined : ciProvider(cfg.ci.provider));
  // 'none' still gets a provider so collectProd answers with its own skipped probe; it never calls one it cannot use.
  const prod = await collectProd(cfg, cloudProvider(cfg.cloud.provider === 'none' ? 'azure-app-insights' : cfg.cloud.provider), readProd(slug), new Date());
  const added = appendProd(slug, prod.points);
  return { ...ci, prod: { added }, probes: [...ci.probes, ...prod.probes] };
}
