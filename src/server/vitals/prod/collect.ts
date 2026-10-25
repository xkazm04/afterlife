// The production half of a collect: ask the cloud for every signal's closed hourly bins since the newest stored
// one (or the last 14 days on a first run) and hand back only the points whose key is not stored yet. The source is
// the one `cfg.cloud.provider` names: App Insights from `resource`, or a Log Analytics workspace from `logs`.
import type { ProbeKind, ProbeResult, ProdPoint, ProjectConfig } from '@/schemas/vitals';
import type { CloudProvider } from '@/server/providers/types';

const HOUR = 3_600_000;
const FIRST_RUN_DAYS = 14;

/** Where the next read starts: the newest stored bin (re-read, then dropped by key), else 14 days back on the hour. */
export function prodSince(stored: ProdPoint[], now: Date): string {
  let max = '';
  for (const p of stored) if (p.binStart > max) max = p.binStart;
  if (max) return max;
  return new Date(Math.floor((now.getTime() - FIRST_RUN_DAYS * 24 * HOUR) / HOUR) * HOUR).toISOString();
}

function probe(kind: ProbeKind, status: ProbeResult['status'], summary: string, args: Record<string, string>, now: Date, ms: number): ProbeResult {
  return { kind, args, status, summary, at: now.toISOString(), ms };
}

/** The query probe and its args for the configured source; undefined when the provider has nothing to read. */
function source(cfg: ProjectConfig): { kind: ProbeKind; args: Record<string, string> } | undefined {
  const { provider, resource, logs } = cfg.cloud;
  if (provider === 'azure-app-insights' && resource) return { kind: 'az-appinsights-query', args: { appId: resource.appId } };
  if (provider === 'azure-log-analytics' && logs) return { kind: 'az-loganalytics-query', args: { workspaceId: logs.workspaceId, ...(logs.site ? { site: logs.site } : {}) } };
  return undefined;
}

export async function collectProd(cfg: ProjectConfig, provider: CloudProvider, stored: ProdPoint[], now: Date): Promise<{ points: ProdPoint[]; probes: ProbeResult[] }> {
  const src = source(cfg);
  const skipKind: ProbeKind = cfg.cloud.provider === 'azure-log-analytics' ? 'az-loganalytics-query' : 'az-appinsights-query';
  if (!src) return { points: [], probes: [probe(skipKind, 'skipped', 'cloud not connected', {}, now, 0)] };
  const { kind, args } = src;
  // A wiring slip, never a person's: the provider handed in must read the configured source.
  if (provider.kind !== cfg.cloud.provider) return { points: [], probes: [probe(kind, 'skipped', `${provider.kind} cannot read a ${cfg.cloud.provider} cloud`, args, now, 0)] };
  const since = prodSince(stored, now);
  const t0 = Date.now();
  let got: ProdPoint[];
  try {
    got = await provider.query(cfg, since);
  } catch (e) {
    return { points: [], probes: [probe(kind, 'fail', e instanceof Error ? e.message : String(e), args, now, Date.now() - t0)] };
  }
  const seen = new Set(stored.map((p) => p.key));
  const points: ProdPoint[] = [];
  for (const p of got) {
    // Only closed bins are kept, so a stored value is final and a re-read never has to replace it.
    if (seen.has(p.key) || Date.parse(p.binStart) + p.binMin * 60_000 > now.getTime()) continue;
    seen.add(p.key);
    points.push(p);
  }
  return { points, probes: [probe(kind, 'ok', `${points.length} new points since ${since}`, args, now, Date.now() - t0)] };
}
