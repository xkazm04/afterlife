// Probes `az-loganalytics-workspace` and `az-loganalytics-query`: find the workspace this login can read, and count a
// day of its App Service HTTP logs. Every workspace call names its fields with --query, so az never prints a shared key.
import type { LogsWorkspace, ProbeResult, ProbeSpec } from '@/schemas/vitals';
import type { Exec } from '../../types';
import { result, runAz, subArgs } from '../insights/az';
import { firstTable } from '../insights/kql';
import { asTable, queryArgs, runLogsQuery } from './az';
import { count24h, sites24h } from './kql';

const SHOW_FIELDS = '{customerId:customerId,name:name,resourceGroup:resourceGroup,id:id}';
const LIST_FIELDS = `[].${SHOW_FIELDS}`;
const NONE = 'no Log Analytics workspace visible to this login';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
/** The subscription id inside an ARM resource id. */
const subOf = (id: string): string | undefined => /\/subscriptions\/([^/]+)/i.exec(id)?.[1];

function found(v: unknown, subscription?: string): Omit<LogsWorkspace, 'site'> | undefined {
  const o = (v ?? {}) as Record<string, unknown>;
  const [workspaceId, name, resourceGroup, id] = [str(o.customerId), str(o.name), str(o.resourceGroup), str(o.id)];
  const sub = subscription ?? (id ? subOf(id) : undefined);
  return workspaceId && name && resourceGroup && sub ? { workspaceId, name, resourceGroup, subscription: sub } : undefined;
}

type Count = { ok: true; n: number } | { ok: false; summary: string; noTable?: true };

/** `site:n,site:n`, busiest first: which App Services write here, so the follow-up can narrow to production. */
async function sitesOf(exec: Exec, workspaceId: string, subscription?: string): Promise<string | undefined> {
  const r = await runLogsQuery(exec, queryArgs(workspaceId, sites24h, 'P1D', subscription));
  if (!r.ok) return undefined;
  const rows = firstTable(asTable(r.json, ['site', 'n'], ['site']))?.rows ?? [];
  const list = rows.filter((x) => typeof x[0] === 'string' && x[0] && typeof x[1] === 'number').map((x) => `${String(x[0])}:${String(x[1])}`);
  return list.length ? list.join(',') : undefined;
}

async function count(exec: Exec, workspaceId: string, site?: string, subscription?: string): Promise<Count> {
  const r = await runLogsQuery(exec, queryArgs(workspaceId, count24h(site), 'P1D', subscription));
  if (!r.ok) return 'noTable' in r ? { ok: false, summary: r.summary, noTable: true } : { ok: false, summary: r.summary };
  const n = firstTable(asTable(r.json, ['Count']))?.rows?.[0]?.[0];
  return typeof n === 'number' ? { ok: true, n } : { ok: false, summary: 'the count query returned no number' };
}

export async function probeWorkspace(exec: Exec, spec: ProbeSpec): Promise<ProbeResult> {
  const t0 = Date.now();
  const { subscription, resourceGroup, name } = spec.args;
  const done = (status: ProbeResult['status'], summary: string, data?: Record<string, string>) =>
    result(spec.kind, spec.args, status, summary, Date.now() - t0, data);

  const r = resourceGroup && name
    ? await runAz(exec, ['monitor', 'log-analytics', 'workspace', 'show', '-g', resourceGroup, '-n', name, ...subArgs(subscription), '--query', SHOW_FIELDS, '-o', 'json'])
    : await runAz(exec, ['monitor', 'log-analytics', 'workspace', 'list', ...(resourceGroup ? ['-g', resourceGroup] : []), ...subArgs(subscription), '--query', LIST_FIELDS, '-o', 'json']);
  if (!r.ok) return done('fail', r.summary);
  const all = (Array.isArray(r.json) ? r.json : [r.json]).map((v) => found(v, subscription)).filter((w) => !!w);
  const ws = all[0];
  if (!ws) return done('fail', resourceGroup && name ? `${name} in ${resourceGroup} has no customerId` : NONE);

  // Whether the HTTP logs are there decides the source; when the count cannot run, that is unknown and left out.
  const c = await count(exec, ws.workspaceId, undefined, ws.subscription);
  const logs = c.ok ? (c.n > 0 ? `${c.n} HTTP requests in 24h` : 'AppServiceHTTPLogs empty in 24h') : c.noTable ? 'no AppServiceHTTPLogs' : `HTTP logs unknown: ${c.summary}`;
  const sites = c.ok && c.n > 0 ? await sitesOf(exec, ws.workspaceId, ws.subscription) : undefined;
  const data: Record<string, string> = { ...ws, ...(c.ok ? { httpLogs: 'yes' } : c.noTable ? { httpLogs: 'no' } : {}), ...(sites ? { sites } : {}) };
  const which = all.length === 1 ? `${ws.name} in ${ws.resourceGroup}` : `${all.length} found, using ${ws.name}: ${all.map((w) => `${w.name} (${w.resourceGroup})`).join(', ')}`;
  return done('ok', `${which} - ${logs}`, data);
}

export async function probeQuery(exec: Exec, spec: ProbeSpec): Promise<ProbeResult> {
  const t0 = Date.now();
  const done = (status: ProbeResult['status'], summary: string, data?: Record<string, string>) =>
    result(spec.kind, spec.args, status, summary, Date.now() - t0, data);
  const { workspaceId, site, subscription } = spec.args;
  if (!workspaceId) return done('fail', 'no workspaceId - run the workspace probe first');
  const c = await count(exec, workspaceId, site, subscription);
  if (!c.ok) return done('fail', c.summary);
  const where = site ? ` for ${site}` : '';
  return done('ok', c.n === 0 ? `no HTTP requests in 24h${where}` : `${c.n} HTTP requests in 24h${where}`, { requests24h: String(c.n) });
}
