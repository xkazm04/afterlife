// The poller reads only the paired group's own projects: belay-policy and belay-ledger by their full path under the
// group, and targets under the group's path. A project shared in, or a subgroup's belay-policy, is never read as the
// group's (F49): the screens would show tiers the gate does not act on.
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlProject } from '@/server/gitlab/types';
import { getActionClasses } from '@/server/index/views';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { rig } from './helpers';

const listing = (port: GitLabPort, f: (all: GlProject[]) => GlProject[]): GitLabPort =>
  new Proxy(port, { get: (t, k, r) => (k === 'listProjects' ? async (g: string | number) => f(await t.listProjects(g)) : Reflect.get(t, k, r)) });

const LEDGER = 90010003;

describe('poll cycle: only the group\'s own projects', () => {
  for (const where of ['acme-lab/team/belay-policy', 'outsider/belay-policy']) {
    it(`reads tiers from acme-lab/belay-policy, not ${where} listed before it`, async () => {
      const r = await rig();
      const policy = r.gl.state.projects.find((p) => p.raw.name === 'belay-policy');
      const ledger = r.gl.state.projects.find((p) => p.raw.id === LEDGER);
      if (!policy || !ledger) throw new Error('demo projects missing');
      Object.assign(ledger.files, policy.files, {
        'tier-state.yml': (policy.files['tier-state.yml'] ?? '').replace(/(qa\.file-bug: \{ tier: )supervised/, '$1hands_off'),
      });
      const port = listing(r.gl.port, (all) => [
        ...all.filter((p) => p.id === LEDGER).map((p) => ({ ...p, path: 'belay-policy', name: 'belay-policy', pathWithNamespace: where })),
        ...all.filter((p) => p.id !== LEDGER),
      ]);
      await r.poll(undefined, port);
      const by = Object.fromEntries((await getActionClasses(r.db, 'ledgerline', new Date())).map((c) => [c.id, c.tier]));
      expect(by['qa.file-bug']).toBe('supervised');
    });
  }

  it('stops polling a project once it is listed outside the group, and shows it stale', async () => {
    const r = await rig();
    await r.poll();
    const away = listing(r.gl.port, (all) => all.map((p) => (p.path === 'ledgerline' ? { ...p, pathWithNamespace: 'outsider/ledgerline' } : p)));
    const second = await r.poll(undefined, away);
    expect(second.projects).toEqual([]);
    expect((await getProjectRow(r.db, 'ledgerline'))?.state).toBe('stale');
  });
});
