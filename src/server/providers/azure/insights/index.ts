// The `azure-app-insights` CloudProvider: the two probes and the binned production signals, all through the
// person's own `az` login, read-only. The registry (providers/registry.ts) hands it out by kind.
import type { ProbeResult, ProbeSpec, ProdPoint, ProjectConfig } from '@/schemas/vitals';
import { defaultExec } from '../../exec';
import type { CloudProvider, Exec } from '../../types';
import { result, runAz, subArgs } from './az';
import { probeComponent } from './component';
import { COUNT_24H, firstTable, kql, SIGNALS, toPoints } from './kql';

/** The query verb; without --offset/--start-time az asks for the last hour only. */
const queryArgs = (appId: string, q: string, range: string[], subscription?: string): string[] =>
  ['monitor', 'app-insights', 'query', '--apps', appId, '--analytics-query', q, ...range, ...subArgs(subscription), '-o', 'json'];

async function probeQuery(exec: Exec, spec: ProbeSpec): Promise<ProbeResult> {
  const t0 = Date.now();
  const done = (status: ProbeResult['status'], summary: string, data?: Record<string, string>) =>
    result(spec.kind, spec.args, status, summary, Date.now() - t0, data);
  const { appId, subscription } = spec.args;
  if (!appId) return done('fail', 'no appId - run the component probe first');
  const r = await runAz(exec, queryArgs(appId, COUNT_24H, ['--offset', '1d'], subscription));
  if (!r.ok) return done('fail', r.summary);
  const n = firstTable(r.json)?.rows?.[0]?.[0];
  if (typeof n !== 'number') return done('fail', 'the count query returned no number');
  return done('ok', n === 0 ? 'no requests in 24h' : `${n} requests in 24h`, { requests24h: String(n) });
}

export function azureInsights(exec: Exec = defaultExec): CloudProvider {
  return {
    kind: 'azure-app-insights',
    probe(spec) {
      if (spec.kind === 'az-appinsights-component') return probeComponent(exec, spec);
      if (spec.kind === 'az-appinsights-query') return probeQuery(exec, spec);
      return Promise.resolve(result(spec.kind, spec.args, 'skipped', `${spec.kind} is not an App Insights probe`, 0));
    },
    /** Every signal's closed bins from `since`. Throws the first failing call's summary; collectProd turns it into a fail probe. */
    async query(cfg: ProjectConfig, since: string): Promise<ProdPoint[]> {
      const res = cfg.cloud.resource;
      if (!res) return [];
      const out: ProdPoint[] = [];
      for (const signal of SIGNALS) {
        const r = await runAz(exec, queryArgs(res.appId, kql(signal, since), ['--start-time', since], res.subscription), 120_000);
        if (!r.ok) throw new Error(r.summary);
        out.push(...toPoints(signal, r.json, new Date()));
      }
      return out;
    },
  };
}
