// enable-app-insights against a fake az: the preview reads the site's region, names the restart and holds no
// connection string; the confirm passes the create's connection string straight to the app setting, never returns it,
// then probes the component and switches the project's cloud, keeping the Log Analytics workspace as metadata.
import { describe, expect, it } from 'vitest';
import type { EnableAppInsights } from '../../types';
import { CONNECTION_PLACEHOLDER } from '../insights';
import { confirmProjectWrite, previewProjectWrite } from '../run';
import { projectRig, WORKSPACE } from './rig';

const rig = projectRig();
const SECRET = 'InstrumentationKey=11111111-2222-3333-4444-555555555555;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com/';
const intent: EnableAppInsights = { kind: 'enable-app-insights', project: 'grinex-portal', name: 'grinexportal-insights', resourceGroup: 'grinex-rg', workspaceId: WORKSPACE, site: 'grinexportal' };

const script = () => {
  rig.answers.push(
    ['webapp show', { stdout: '"West Europe"' }],
    ['monitor app-insights component create', { stdout: JSON.stringify({ name: 'grinexportal-insights', connectionString: SECRET, instrumentationKey: '11111111-2222-3333-4444-555555555555' }) }],
    ['webapp config appsettings set', { stdout: '' }],
    ['monitor app-insights component show', { stdout: JSON.stringify({ appId: 'app-guid', name: 'grinexportal-insights', resourceGroup: 'grinex-rg', id: '/subscriptions/sub-1/resourceGroups/grinex-rg/providers/microsoft.insights/components/grinexportal-insights' }) }],
  );
};

describe('enable-app-insights', () => {
  it('previews create, app setting and probe in order, in the site region, and says the app restarts', async () => {
    script();
    const r = await previewProjectWrite(rig.deps, intent);
    if (r.status !== 'preview') throw new Error(JSON.stringify(r));
    const [create, set, show] = r.preview.commands.map((c) => c.display);
    expect(create).toBe(`az monitor app-insights component create --app grinexportal-insights -g grinex-rg --location westeurope --workspace ${WORKSPACE} --kind web --application-type web --subscription sub-1 -o json`);
    expect(set).toBe(`az webapp config appsettings set -g grinex-rg -n grinexportal --settings "APPLICATIONINSIGHTS_CONNECTION_STRING=${CONNECTION_PLACEHOLDER}" --subscription sub-1 -o none`);
    expect(show).toMatch(/^az monitor app-insights component show --app grinexportal-insights/);
    expect(r.preview.notes?.[0]).toMatch(/RESTARTS the app: grinexportal restarts.*staging slot first/);
    expect(r.preview.risk).toBe('merge');
    expect(rig.calls.map((c) => c.slice(1, 3).join(' '))).toEqual(['webapp show']); // the preview only read the region
  });

  it('never holds the connection string in a preview or an answer; the second command gets it as one argv', async () => {
    script();
    const p = await previewProjectWrite(rig.deps, { ...intent, slot: 'staging' });
    if (p.status !== 'preview') throw new Error(JSON.stringify(p));
    expect(JSON.stringify(p)).not.toContain('InstrumentationKey');
    const r = await confirmProjectWrite(rig.deps, { ...intent, slot: 'staging' }, p.preview.previewId);
    expect(r.status).toBe('done');
    expect(JSON.stringify(r)).not.toContain(SECRET);
    expect(JSON.stringify(r)).not.toContain('InstrumentationKey');
    const set = rig.calls.find((c) => c.slice(1, 5).join(' ') === 'webapp config appsettings set')!;
    expect(set).toContain(`APPLICATIONINSIGHTS_CONNECTION_STRING=${SECRET}`);
    expect(set).toEqual(expect.arrayContaining(['--slot', 'staging']));
    expect(rig.saved).toHaveLength(1);
    expect(rig.saved[0]!.cloud).toEqual({ provider: 'azure-app-insights', resource: { appId: 'app-guid', name: 'grinexportal-insights', resourceGroup: 'grinex-rg', subscription: 'sub-1' }, logs: rig.cfg.cloud.logs });
    expect(JSON.stringify(rig.saved[0])).not.toContain('InstrumentationKey');
  });

  it('redacts the connection string from a failed app setting, sets nothing without one, and keeps the cloud when the probe fails', async () => {
    script();
    rig.answers.unshift(['webapp config appsettings set', { code: 1, stderr: `ERROR: bad value ${SECRET}` }]);
    let p = await previewProjectWrite(rig.deps, intent);
    let r = p.status === 'preview' ? await confirmProjectWrite(rig.deps, intent, p.preview.previewId) : p;
    expect(r.status).toBe('failed');
    expect(JSON.stringify(r)).not.toContain('InstrumentationKey');
    rig.answers.length = 0;
    script();
    rig.answers.unshift(['monitor app-insights component create', { stdout: '{"name":"x"}' }]);
    rig.now.t += 1000;
    p = await previewProjectWrite(rig.deps, { ...intent, slot: 'blue' });
    r = p.status === 'preview' ? await confirmProjectWrite(rig.deps, { ...intent, slot: 'blue' }, p.preview.previewId) : p;
    expect(r.status === 'failed' && r.results.at(-1)?.error).toMatch(/without a connection string; nothing was set/);
    expect(rig.calls.filter((c) => c[2] === 'config')).toHaveLength(1); // only the first, failed, attempt reached appsettings
    expect(rig.saved).toEqual([]);
  });

  it('refuses a location that is not the site region, and a project already on App Insights', async () => {
    script();
    expect(await previewProjectWrite(rig.deps, { ...intent, location: 'northeurope' })).toEqual({ status: 'refused', reason: 'grinexportal runs in westeurope, not northeurope: the component goes in the site\'s own region' });
    rig.cfg = { ...rig.cfg, cloud: { provider: 'azure-app-insights', resource: { appId: 'a', name: 'n', resourceGroup: 'r', subscription: 's' } } };
    expect(await previewProjectWrite(rig.deps, intent)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/already reads App Insights/) });
  });
});
