import { describe, expect, it } from 'vitest';
import { COUNT, EXPIRED, NO_EXTENSION_ERR, NO_TABLE_ERR, SUB, WORKSPACE, WS_ID, fakeAz } from './fixtures';
import { azureLogs } from './index';

const workspace = (args: Record<string, string>) => ({ kind: 'az-loganalytics-workspace' as const, args });
const SHOW = ['workspace', 'show'];
const LIST = ['workspace', 'list'];
const QUERY = ['log-analytics', 'query', '-w', WS_ID];

describe('az-loganalytics-workspace', () => {
  it('with a resource group and name it shows that workspace, keeps four fields and says the HTTP logs are there', async () => {
    const { exec, calls } = fakeAz([
      { match: [...SHOW, '-g', 'shop-rg', '-n', 'shop-logs'], reply: { stdout: WORKSPACE } },
      { match: QUERY, reply: { stdout: COUNT(596) } },
    ]);
    const r = await azureLogs(exec).probe(workspace({ resourceGroup: 'shop-rg', name: 'shop-logs' }));
    expect(r).toMatchObject({
      status: 'ok',
      summary: 'shop-logs in shop-rg - 596 HTTP requests in 24h',
      data: { workspaceId: WS_ID, name: 'shop-logs', resourceGroup: 'shop-rg', subscription: SUB, httpLogs: 'yes' },
    });
    // The fields are named in --query, so az itself never prints the workspace's shared keys.
    expect(calls[0]).toEqual(expect.arrayContaining(['--query', '{customerId:customerId,name:name,resourceGroup:resourceGroup,id:id}']));
    expect(calls.flat().join(' ')).not.toMatch(/shared-keys|get-shared-keys|primarySharedKey/i);
  });

  it('without hints it lists, and with several it says how many and which one it uses', async () => {
    const other = { ...WORKSPACE, customerId: '33333333-4444-4555-8666-777777777777', name: 'ops-logs', id: WORKSPACE.id.replace('shop-logs', 'ops-logs') };
    const { exec, calls } = fakeAz([{ match: LIST, reply: { stdout: [WORKSPACE, other] } }, { match: QUERY, reply: { stdout: COUNT(12) } }]);
    const r = await azureLogs(exec).probe(workspace({}));
    expect(r).toMatchObject({ status: 'ok', summary: '2 found, using shop-logs: shop-logs (shop-rg), ops-logs (shop-rg) - 12 HTTP requests in 24h', data: { workspaceId: WS_ID } });
    expect(calls[0]).not.toContain('-g');
  });

  it('a resource group alone narrows the list', async () => {
    const { exec, calls } = fakeAz([{ match: [...LIST, '-g', 'shop-rg'], reply: { stdout: [WORKSPACE] } }, { match: QUERY, reply: { stdout: COUNT(1) } }]);
    expect((await azureLogs(exec).probe(workspace({ resourceGroup: 'shop-rg' }))).status).toBe('ok');
    expect(calls[0]).toEqual(expect.arrayContaining(['-g', 'shop-rg']));
  });

  it('none visible is a fail, without querying anything', async () => {
    const { exec, calls } = fakeAz([{ match: LIST, reply: { stdout: [] } }]);
    expect(await azureLogs(exec).probe(workspace({}))).toMatchObject({ status: 'fail', summary: 'no Log Analytics workspace visible to this login' });
    expect(calls).toHaveLength(1);
  });

  it('a workspace without the HTTP logs is still found, and says the logs are not there', async () => {
    const { exec } = fakeAz([{ match: LIST, reply: { stdout: [WORKSPACE] } }, { match: QUERY, reply: { code: 1, stderr: NO_TABLE_ERR } }]);
    expect(await azureLogs(exec).probe(workspace({}))).toMatchObject({ status: 'ok', summary: 'shop-logs in shop-rg - no AppServiceHTTPLogs', data: { httpLogs: 'no' } });
  });

  it('when the count cannot run, whether the logs are there is unknown: the key is left out, never "no"', async () => {
    const { exec } = fakeAz([{ match: LIST, reply: { stdout: [WORKSPACE] } }, { match: QUERY, reply: { code: 1, stderr: NO_EXTENSION_ERR } }]);
    const r = await azureLogs(exec).probe(workspace({}));
    expect(r.summary).toBe('shop-logs in shop-rg - HTTP logs unknown: the az log-analytics extension is not installed - run `az extension add -n log-analytics`');
    expect(r.data).not.toHaveProperty('httpLogs');
  });

  it('a lapsed login is a fail whose summary names the re-login command, never a throw', async () => {
    const { exec } = fakeAz([{ match: LIST, reply: { code: 1, stderr: EXPIRED } }]);
    const r = await azureLogs(exec).probe(workspace({}));
    expect(r).toMatchObject({ status: 'fail', summary: 'ERROR: AADSTS700082: The refresh token has expired due to inactivity. - run `az login`' });
    expect(r.data).toBeUndefined();
  });
});

describe('az-loganalytics-query', () => {
  const query = (args: Record<string, string>) => ({ kind: 'az-loganalytics-query' as const, args });

  it('counts a day of one site\'s HTTP requests, the slot excluded by the _ResourceId suffix', async () => {
    const { exec, calls } = fakeAz([{ match: QUERY, reply: { stdout: COUNT(480) } }]);
    const r = await azureLogs(exec).probe(query({ workspaceId: WS_ID, site: 'shopfront' }));
    expect(r).toMatchObject({ status: 'ok', summary: '480 HTTP requests in 24h for shopfront', data: { requests24h: '480' } });
    expect(calls[0]).toEqual(expect.arrayContaining([
      '--analytics-query', 'AppServiceHTTPLogs | where TimeGenerated > ago(1d) | where _ResourceId endswith "/sites/shopfront" | count',
      '--timespan', 'P1D',
    ]));
  });

  it('zero requests is still ok, said plainly', async () => {
    const { exec } = fakeAz([{ match: QUERY, reply: { stdout: COUNT(0) } }]);
    expect(await azureLogs(exec).probe(query({ workspaceId: WS_ID }))).toMatchObject({ status: 'ok', summary: 'no HTTP requests in 24h' });
  });

  it('a missing table fails with the reason a person can act on, not az\'s generic first line', async () => {
    const { exec } = fakeAz([{ match: QUERY, reply: { code: 1, stderr: NO_TABLE_ERR } }]);
    expect(await azureLogs(exec).probe(query({ workspaceId: WS_ID }))).toMatchObject({
      status: 'fail', summary: 'no AppServiceHTTPLogs in this workspace - the App Service diagnostic setting is off',
    });
  });

  it('no workspaceId fails without calling az', async () => {
    const { exec, calls } = fakeAz([]);
    expect((await azureLogs(exec).probe(query({}))).status).toBe('fail');
    expect(calls).toHaveLength(0);
  });

  it('an App Insights probe is not this provider\'s: skipped', async () => {
    const { exec } = fakeAz([]);
    expect((await azureLogs(exec).probe({ kind: 'az-appinsights-query', args: {} })).status).toBe('skipped');
  });
});
