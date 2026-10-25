// Probe `az-appinsights-component`: find the App Insights component this login can read. Every call names its
// fields with --query, so the instrumentation key and connection string never leave az.
import type { CloudResource, ProbeResult, ProbeSpec } from '@/schemas/vitals';
import type { Exec } from '../../types';
import { result, runAz, subArgs } from './az';

const SHOW_FIELDS = '{appId:appId,name:name,resourceGroup:resourceGroup,id:id}';
const LIST_FIELDS = '[].{name:name,resourceGroup:resourceGroup,id:id}';
const MAX_SUBSCRIPTIONS = 10;
const NONE = 'no App Insights component visible to this login';

interface Found { name: string; resourceGroup: string; id: string; appId?: string }

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
/** The subscription id inside an ARM resource id. */
const subOf = (id: string): string | undefined => /\/subscriptions\/([^/]+)/i.exec(id)?.[1];

function found(v: unknown): Found | undefined {
  const o = (v ?? {}) as Record<string, unknown>;
  const name = str(o.name);
  const resourceGroup = str(o.resourceGroup);
  const id = str(o.id);
  if (!name || !resourceGroup || !id) return undefined;
  return { name, resourceGroup, id, ...(str(o.appId) ? { appId: str(o.appId) } : {}) };
}

function toResource(f: Found, subscription?: string): CloudResource | undefined {
  const sub = subscription ?? subOf(f.id);
  return f.appId && sub ? { appId: f.appId, name: f.name, resourceGroup: f.resourceGroup, subscription: sub } : undefined;
}

export async function probeComponent(exec: Exec, spec: ProbeSpec): Promise<ProbeResult> {
  const t0 = Date.now();
  const { subscription, resourceGroup, name } = spec.args;
  const done = (status: ProbeResult['status'], summary: string, data?: Record<string, string>) =>
    result(spec.kind, spec.args, status, summary, Date.now() - t0, data);
  const ok = (r: CloudResource, total: number, all: Found[]) => {
    const data = { appId: r.appId, name: r.name, resourceGroup: r.resourceGroup, subscription: r.subscription };
    if (total === 1) return done('ok', `${r.name} in ${r.resourceGroup}`, data);
    const list = all.map((f) => `${f.name} (${f.resourceGroup})`).join(', ');
    return done('ok', `${total} found, using ${r.name}: ${list}`, data);
  };

  if (resourceGroup && name) {
    const r = await runAz(exec, ['monitor', 'app-insights', 'component', 'show', '--app', name, '-g', resourceGroup, ...subArgs(subscription), '--query', SHOW_FIELDS, '-o', 'json']);
    if (!r.ok) return done('fail', r.summary);
    const f = found(r.json);
    const res = f && toResource(f, subscription);
    return res ? ok(res, 1, [f]) : done('fail', `${name} in ${resourceGroup} has no appId`);
  }

  // No hint: the current (or given) subscription first, then every subscription the login lists.
  const subs: (string | undefined)[] = [subscription];
  let all = await list(exec, subscription);
  if (!all.ok) return done('fail', all.summary);
  if (all.items.length === 0 && !subscription) {
    const acc = await runAz(exec, ['account', 'list', '--query', '[].id', '-o', 'json']);
    const ids = acc.ok && Array.isArray(acc.json) ? acc.json.filter((x): x is string => typeof x === 'string') : [];
    let unreadable = 0;
    for (const id of ids.slice(0, MAX_SUBSCRIPTIONS)) {
      const l = await list(exec, id);
      if (!l.ok) { unreadable++; continue; }
      if (l.items.length) { all = l; subs[0] = id; break; }
    }
    if (all.items.length === 0) return done('fail', unreadable ? `${NONE} (${unreadable} subscription${unreadable === 1 ? '' : 's'} could not be read - \`az login\` into their tenant)` : NONE);
  }
  if (all.items.length === 0) return done('fail', NONE);

  const first = all.items[0]!;
  const show = await runAz(exec, ['monitor', 'app-insights', 'component', 'show', '--ids', first.id, '--query', SHOW_FIELDS, '-o', 'json']);
  if (!show.ok) return done('fail', show.summary);
  const f = found(show.json);
  const res = f && toResource(f, subs[0]);
  return res ? ok(res, all.items.length, all.items) : done('fail', `${first.name} in ${first.resourceGroup} has no appId`);
}

async function list(exec: Exec, subscription?: string): Promise<{ ok: true; items: Found[] } | { ok: false; summary: string }> {
  const r = await runAz(exec, ['resource', 'list', '--resource-type', 'microsoft.insights/components', ...subArgs(subscription), '--query', LIST_FIELDS, '-o', 'json']);
  if (!r.ok) return r;
  const items = Array.isArray(r.json) ? r.json.map(found).filter((f): f is Found => !!f) : [];
  return { ok: true, items };
}
