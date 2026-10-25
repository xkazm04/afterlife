// enable-app-insights: the wizard's "Turn on App Insights" person step for an app whose cloud is Log Analytics only.
// Preview: the App Service's own region is read (`az webapp show`, a read), then the three commands are shown: create
// a workspace-based component, set the site's APPLICATIONINSIGHTS_CONNECTION_STRING (which RESTARTS the app), and the
// component probe. Confirm: the connection string is read from the create's JSON and passed straight to the second
// command's argv; it is never displayed, returned, stored or logged. Once the probe answers with an appId the
// project's cloud becomes azure-app-insights and its Log Analytics workspace stays on it as metadata.
import type { ProjectConfig } from '@/schemas/vitals';
import { azureInsights } from '@/server/providers/azure/insights';
import type { CommandOutcome, EnableAppInsights } from '../types';
import { displayOf, errorLine, ProjectRefused, type ProjectDeps, type ProjectPlan } from './context';
import { regionName } from './intents';

export const CONNECTION_PLACEHOLDER = '<from the create output>';
const SETTING = 'APPLICATIONINSIGHTS_CONNECTION_STRING';

/** The site's region as az reports it ("West Europe" -> westeurope), read before anything is shown. */
async function siteRegion(deps: ProjectDeps, i: EnableAppInsights, sub: string[]): Promise<string> {
  const r = await deps.exec('az', ['webapp', 'show', '-g', i.resourceGroup, '-n', i.site, ...(i.slot ? ['--slot', i.slot] : []), ...sub, '--query', 'location', '-o', 'json']);
  if (r.code !== 0) throw new ProjectRefused(`could not read ${i.site}'s region: ${errorLine(r.stderr, r.code)}`);
  let v: unknown;
  try {
    v = JSON.parse(r.stdout);
  } catch {
    v = undefined;
  }
  if (typeof v !== 'string' || !/^[a-z0-9]{2,40}$/.test(regionName(v))) throw new ProjectRefused(`az named no region for ${i.site}`);
  return regionName(v);
}

const redact = (s: string, secret: string | undefined): string => (secret ? s.split(secret).join('<connection string>') : s);

export async function planInsights(deps: ProjectDeps, i: EnableAppInsights): Promise<ProjectPlan> {
  const cfg = deps.project(i.project);
  if (!cfg) throw new ProjectRefused(`no saved project has the slug ${i.project}`);
  if (cfg.cloud.provider === 'azure-app-insights') throw new ProjectRefused(`${cfg.slug} already reads App Insights (${cfg.cloud.resource?.name ?? 'a component'})`);
  const subscription = cfg.cloud.logs?.subscription;
  const sub = subscription ? ['--subscription', subscription] : [];
  const location = await siteRegion(deps, i, sub);
  if (i.location && i.location !== location) throw new ProjectRefused(`${i.site} runs in ${location}, not ${i.location}: the component goes in the site's own region`);
  const slot = i.slot ? ['--slot', i.slot] : [];

  const create = ['monitor', 'app-insights', 'component', 'create', '--app', i.name, '-g', i.resourceGroup, '--location', location, '--workspace', i.workspaceId, '--kind', 'web', '--application-type', 'web', ...sub, '-o', 'json'];
  const setArgv = (conn: string) => ['webapp', 'config', 'appsettings', 'set', '-g', i.resourceGroup, '-n', i.site, ...slot, '--settings', `${SETTING}=${conn}`, ...sub, '-o', 'none'];
  const show = ['monitor', 'app-insights', 'component', 'show', '--app', i.name, '-g', i.resourceGroup, ...sub, '--query', '{appId:appId,name:name,resourceGroup:resourceGroup,id:id}', '-o', 'json'];
  const commands = [
    { display: displayOf('az', create), argv: create, risk: 'merge' as const },
    { display: displayOf('az', setArgv(CONNECTION_PLACEHOLDER)), argv: setArgv(CONNECTION_PLACEHOLDER), risk: 'merge' as const },
    { display: displayOf('az', show), argv: show, risk: 'low' as const },
  ];
  const where = i.slot ? `${i.site}, slot ${i.slot}` : i.site;

  const run = async (): Promise<CommandOutcome[]> => {
    const out: CommandOutcome[] = [];
    const fail = (n: number, exit: number, error: string) => (out.push({ display: commands[n]!.display, exit: exit || 1, ok: false, simulated: false, error }), out);
    const c = await deps.exec('az', create, { timeoutMs: 180_000 });
    let conn: string | undefined;
    try {
      const j = c.code === 0 ? (JSON.parse(c.stdout) as { connectionString?: unknown }) : null;
      conn = typeof j?.connectionString === 'string' && /InstrumentationKey=/.test(j.connectionString) ? j.connectionString : undefined;
    } catch {
      conn = undefined;
    }
    if (c.code !== 0) return fail(0, c.code, errorLine(c.stderr, c.code));
    if (!conn) return fail(0, 1, 'the create answered without a connection string; nothing was set on the site');
    out.push({ display: commands[0]!.display, exit: 0, ok: true, simulated: false, made: `component ${i.name}` });
    const s = await deps.exec('az', setArgv(conn), { timeoutMs: 180_000 });
    if (s.code !== 0) return fail(1, s.code, redact(errorLine(s.stderr, s.code), conn));
    out.push({ display: commands[1]!.display, exit: 0, ok: true, simulated: false, made: `${SETTING} set on ${where}` });
    const probe = await azureInsights(deps.exec).probe({ kind: 'az-appinsights-component', args: { resourceGroup: i.resourceGroup, name: i.name, ...(subscription ? { subscription } : {}) } });
    const appId = probe.data?.appId;
    const res = probe.status === 'ok' && appId && probe.data?.subscription ? { appId, name: i.name, resourceGroup: i.resourceGroup, subscription: probe.data.subscription } : undefined;
    if (!res) return fail(2, 1, `the component probe did not confirm it (${probe.summary}); the cloud stays ${cfg.cloud.provider}`);
    const next: ProjectConfig = { ...cfg, cloud: { provider: 'azure-app-insights', resource: res, ...(cfg.cloud.logs ? { logs: cfg.cloud.logs } : {}) }, probes: [...cfg.probes, probe] };
    deps.save(next);
    out.push({ display: commands[2]!.display, exit: 0, ok: true, simulated: false, made: 'cloud: azure-app-insights' });
    return out;
  };

  return {
    title: `Turn on App Insights for ${where}`,
    summary: `Creates the App Insights component ${i.name} in ${i.resourceGroup} (${location}) on the workspace, points ${where} at it, then probes it; Vitals then reads App Insights.`,
    commands,
    diff: [],
    notes: [
      `Setting an app setting RESTARTS the app: ${where} restarts when the second command runs.${i.slot ? '' : ' Doing it on a staging slot first (slot, then swap) is recommended.'}`,
      'The connection string is read from the create output and passed straight to the second command: it is never shown or stored.',
      `Runs as your own az login${subscription ? ` in subscription ${subscription}` : ''}. If the probe does not confirm the component, the cloud stays ${cfg.cloud.provider}.`,
    ],
    run,
  };
}
