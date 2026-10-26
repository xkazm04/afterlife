// previewAction / confirmAction route the setup kinds to actions/setup before any GitLab deps: they answer in demo mode
// (no live runtime exists), refuse another host, and a set-setup confirm that ran renders the route again.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmAction, previewAction } from '../../actions';
import { setupRig } from './rig';

const at = vi.hoisted(() => ({ host: 'localhost:3000', refreshed: 0, deps: null as unknown }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: at.host }) }));
vi.mock('next/cache', () => ({ refresh: () => void (at.refreshed += 1) }));
vi.mock('../context', async (real) => ({ ...(await real<object>()), setupDeps: () => at.deps }));

const rig = setupRig('windows');
afterEach(() => {
  at.host = 'localhost:3000';
  at.refreshed = 0;
});

describe('the setup kinds through the server actions', () => {
  it('preview and confirm in demo mode, as this machine', async () => {
    at.deps = rig.deps;
    const intent = { kind: 'set-setup', groupId: '777', mode: 'live' };
    const p = await previewAction(intent);
    expect(p).toMatchObject({ status: 'preview', preview: { kind: 'set-setup', mode: 'live' } });
    if (p.status !== 'preview') return;
    expect(await confirmAction(intent, p.preview.previewId)).toMatchObject({ status: 'done' });
    expect([rig.restarts, at.refreshed]).toEqual([1, 1]);
  });

  it('refuse another host before anything is planned, and a malformed intent with its reason', async () => {
    at.deps = rig.deps;
    at.host = 'evil.example';
    expect(await previewAction({ kind: 'install-glab' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/not localhost/) });
    expect(await confirmAction({ kind: 'install-glab' }, 'x')).toMatchObject({ status: 'refused', reason: expect.stringMatching(/not localhost/) });
    at.host = 'localhost:3000';
    expect(await previewAction({ kind: 'glab-login', host: 'https://x' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/hostname/) });
    expect(rig.execs.length + rig.launches.length).toBe(0);
  });
});
