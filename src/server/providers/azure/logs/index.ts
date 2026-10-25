// The `azure-log-analytics` CloudProvider, for an app with no App Insights: the two probes and the binned production
// signals out of a workspace's App Service HTTP logs, through the person's own `az` login, read-only. Requests,
// failed-rate and p95-ms only - the logs hold no exceptions or availability tests, so those stay unknown.
import type { ProdPoint, ProjectConfig } from '@/schemas/vitals';
import { defaultExec } from '../../exec';
import type { CloudProvider, Exec } from '../../types';
import { result } from '../insights/az';
import { toPoints } from '../insights/kql';
import { asTable, queryArgs, runLogsQuery } from './az';
import { COLUMNS, kql, LOGS_SIGNALS } from './kql';
import { probeQuery, probeWorkspace } from './workspace';

export function azureLogs(exec: Exec = defaultExec, now: () => Date = () => new Date()): CloudProvider {
  return {
    kind: 'azure-log-analytics',
    probe(spec) {
      if (spec.kind === 'az-loganalytics-workspace') return probeWorkspace(exec, spec);
      if (spec.kind === 'az-loganalytics-query') return probeQuery(exec, spec);
      return Promise.resolve(result(spec.kind, spec.args, 'skipped', `${spec.kind} is not a Log Analytics probe`, 0));
    },
    /** Every signal's closed bins from `since`. Throws the first failing call's summary; collectProd turns it into a fail probe. */
    async query(cfg: ProjectConfig, since: string): Promise<ProdPoint[]> {
      const ws = cfg.cloud.logs;
      if (!ws) return [];
      const at = now();
      // The KQL filters from `since`; the timespan bounds the same window, so the service scans no more than that.
      const span = `${since}/${at.toISOString()}`;
      const out: ProdPoint[] = [];
      for (const signal of LOGS_SIGNALS) {
        const r = await runLogsQuery(exec, queryArgs(ws.workspaceId, kql(signal, since, ws.site), span, ws.subscription), 120_000);
        if (!r.ok) throw new Error(r.summary);
        out.push(...toPoints(signal, asTable(r.json, COLUMNS), at));
      }
      return out;
    },
  };
}
