import { describe, expect, it } from 'vitest';
import { APP_ID, COMPONENT, COUNT, EXPIRED, SUB, fakeAz } from './fixtures';
import { azureInsights } from './index';

const component = (args: Record<string, string>) => ({ kind: 'az-appinsights-component' as const, args });
const SHOW = ['component', 'show'];
const LIST = ['resource', 'list'];

describe('az-appinsights-component', () => {
  it('with a resource group and name it shows that component and keeps four fields', async () => {
    const { exec, calls } = fakeAz([{ match: [...SHOW, '--app', 'shopfront', '-g', 'shop-rg'], reply: { stdout: COMPONENT } }]);
    const r = await azureInsights(exec).probe(component({ resourceGroup: 'shop-rg', name: 'shopfront' }));
    expect(r).toMatchObject({ status: 'ok', summary: 'shopfront in shop-rg', data: { appId: APP_ID, name: 'shopfront', resourceGroup: 'shop-rg', subscription: SUB } });
    expect(calls).toHaveLength(1);
    // The fields are named in --query, so az itself never prints the instrumentation key or connection string.
    expect(calls[0]).toContain('--query');
    expect(JSON.stringify(r)).not.toMatch(/instrumentation|connection/i);
  });

  it('without hints it lists, and with several it says how many and which one it uses', async () => {
    const other = { ...COMPONENT, name: 'backoffice', id: COMPONENT.id.replace('shopfront', 'backoffice') };
    const { exec } = fakeAz([
      { match: LIST, reply: { stdout: [{ name: 'shopfront', resourceGroup: 'shop-rg', id: COMPONENT.id }, { name: 'backoffice', resourceGroup: 'shop-rg', id: other.id }] } },
      { match: [...SHOW, '--ids', COMPONENT.id], reply: { stdout: COMPONENT } },
    ]);
    const r = await azureInsights(exec).probe(component({}));
    expect(r.status).toBe('ok');
    expect(r.summary).toBe('2 found, using shopfront: shopfront (shop-rg), backoffice (shop-rg)');
    expect(r.data?.appId).toBe(APP_ID);
  });

  it('an empty default subscription walks the account list and names the ones it could not read', async () => {
    const { exec, calls } = fakeAz([
      { match: [...LIST, '--subscription', 'sub-b'], reply: { code: 1, stderr: 'ERROR: A login hint was sent that does not match.\naz login --tenant "t"' } },
      { match: [...LIST, '--subscription', 'sub-c'], reply: { stdout: [] } },
      { match: LIST, reply: { stdout: [] } },
      { match: ['account', 'list'], reply: { stdout: ['sub-a', 'sub-b', 'sub-c'] } },
    ]);
    const r = await azureInsights(exec).probe(component({}));
    expect(r).toMatchObject({ status: 'fail', summary: 'no App Insights component visible to this login (1 subscription could not be read - `az login` into their tenant)' });
    expect(calls.filter((c) => c.includes('resource'))).toHaveLength(4);
  });

  it('a lapsed login is a fail whose summary names the re-login command, never a throw', async () => {
    const { exec } = fakeAz([{ match: LIST, reply: { code: 1, stderr: EXPIRED } }]);
    const r = await azureInsights(exec).probe(component({}));
    expect(r).toMatchObject({ status: 'fail', summary: 'ERROR: AADSTS700082: The refresh token has expired due to inactivity. - run `az login`' });
    expect(r.data).toBeUndefined();
  });

  it('a missing component is a fail with az\'s own reason', async () => {
    const { exec } = fakeAz([{ match: SHOW, reply: { code: 3, stderr: "ERROR: (ResourceNotFound) The Resource 'x' was not found." } }]);
    const r = await azureInsights(exec).probe(component({ resourceGroup: 'shop-rg', name: 'x' }));
    expect(r).toMatchObject({ status: 'fail', summary: "ERROR: (ResourceNotFound) The Resource 'x' was not found." });
  });
});

describe('az-appinsights-query', () => {
  const query = { kind: 'az-appinsights-query' as const, args: { appId: APP_ID } };

  it('counts a day of requests, asking az for a day rather than its one-hour default', async () => {
    const { exec, calls } = fakeAz([{ match: ['query', '--apps', APP_ID], reply: { stdout: COUNT(188829) } }]);
    const r = await azureInsights(exec).probe(query);
    expect(r).toMatchObject({ status: 'ok', summary: '188829 requests in 24h', data: { requests24h: '188829' } });
    expect(calls[0]).toEqual(expect.arrayContaining(['--analytics-query', 'requests | where timestamp > ago(1d) | count', '--offset', '1d']));
  });

  it('zero requests is still ok, said plainly', async () => {
    const { exec } = fakeAz([{ match: ['query'], reply: { stdout: COUNT(0) } }]);
    expect(await azureInsights(exec).probe(query)).toMatchObject({ status: 'ok', summary: 'no requests in 24h' });
  });

  it('no appId fails without calling az', async () => {
    const { exec, calls } = fakeAz([]);
    expect((await azureInsights(exec).probe({ kind: 'az-appinsights-query', args: {} })).status).toBe('fail');
    expect(calls).toHaveLength(0);
  });
});
