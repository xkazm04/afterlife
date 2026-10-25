// The save step's writes are built on the server from the saved project: the skill always, App Insights only for a
// Log Analytics cloud with a site, its workspace id from the saved logs block, and every intent one the validator takes.
import { describe, expect, it, vi } from 'vitest';
import { parseIntent } from '@/server/actions/intents';

const logs = { workspaceId: 'w', name: 'grinexportal-logs', resourceGroup: 'grinex-rg', subscription: '00000000-0000-0000-0000-000000000001', site: 'grinexportal' };
const projects = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock('@/server/discover', () => ({ loadProjects: () => projects.list }));
const { saveWrites } = await import('./writes');

describe('saveWrites', () => {
  it('offers the skill and App Insights for a Log Analytics cloud, as intents the server accepts', async () => {
    projects.list = [{ slug: 'grinex-portal', cloud: { provider: 'azure-log-analytics', logs } }];
    const w = await saveWrites('grinex-portal');
    expect(w.skill).toEqual({ kind: 'install-skill', project: 'grinex-portal' });
    expect(w.insights).toEqual({
      kind: 'enable-app-insights', project: 'grinex-portal', name: 'grinexportal-insights', resourceGroup: 'grinex-rg', site: 'grinexportal',
      workspaceId: '/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/grinex-rg/providers/Microsoft.OperationalInsights/workspaces/grinexportal-logs',
    });
    expect(parseIntent(w.insights)).toEqual({ ok: true, intent: w.insights });
  });
  it('says why there is no App Insights write, and nothing for an unknown slug', async () => {
    projects.list = [{ slug: 'a', cloud: { provider: 'azure-app-insights' } }, { slug: 'b', cloud: { provider: 'none' } }];
    expect((await saveWrites('a')).insights).toEqual({ reason: 'App Insights is already its cloud' });
    expect((await saveWrites('b')).insights).toMatchObject({ reason: expect.stringMatching(/no App Service/) });
    expect(await saveWrites('ghost')).toEqual({});
  });
});
