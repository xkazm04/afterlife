// A live write acts as the operator's own glab login, and `next dev` / `next start` listen on 0.0.0.0. Next refuses an
// Origin that differs from the Host, but a page reached through DNS rebinding sends its own name as both, and a request
// with no Origin passes with a warning. So in live mode the server actions answer only a request addressed to this
// machine by a loopback name: anything else is refused before anything is planned, read or run.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listCommands } from '@/server/index/repositories/commandsRun';
import type { ActionDeps } from '../run';
import type { ActionResponse } from '../types';
import { liveRig, type ActionRig } from './rig';

const at = vi.hoisted(() => ({ headers: new Headers(), deps: null as ActionDeps | null, rt: null as unknown }));
vi.mock('next/headers', () => ({ headers: async () => at.headers }));
vi.mock('next/cache', () => ({ refresh: () => undefined }));
vi.mock('../deps', () => ({ actionDeps: () => at.deps }));
vi.mock('@/server/data/live/runtime', () => ({ readyRuntime: () => at.rt }));

const { confirmAction, previewAction } = await import('../actions');
const { repollAction } = await import('../repollAction');

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };
const from = (h: Record<string, string>) => (at.headers = new Headers(h));
const idOf = (r: ActionResponse) => (r.status === 'preview' ? r.preview.previewId : 'f'.repeat(64));

let rig: ActionRig;
beforeEach(async () => {
  vi.stubEnv('BELAY_MODE', 'live');
  rig = await liveRig();
  at.deps = rig.deps;
});
afterEach(() => vi.unstubAllEnvs());

/** A preview id for the revoke, as the operator's own page on localhost would get it. */
async function localId(): Promise<string> {
  from({ host: 'localhost:3000', origin: 'http://localhost:3000' });
  return idOf(await previewAction(revoke));
}

describe('live server actions answer only a request addressed to this machine', () => {
  const away: Array<[string, Record<string, string>]> = [
    ['a page reached through DNS rebinding (its own name as Host and Origin)', { host: 'evil.example:3000', origin: 'http://evil.example:3000' }],
    ['a LAN address, with no Origin at all', { host: '192.168.1.20:3000' }],
    ['a rebinding page that names localhost in X-Forwarded-Host', { host: 'evil.example:3000', 'x-forwarded-host': 'localhost:3000', origin: 'http://evil.example:3000' }],
    ['localhost as Host, another X-Forwarded-Host', { host: 'localhost:3000', 'x-forwarded-host': 'evil.example:3000', origin: 'http://evil.example:3000' }],
    ['localhost as Host, another Origin', { host: 'localhost:3000', origin: 'http://evil.example' }],
    ['an opaque Origin', { host: 'localhost:3000', origin: 'null' }],
    ['a name that only starts like localhost', { host: 'localhost.evil.example:3000' }],
  ];

  it.each(away)('confirm refuses %s: nothing runs and nothing is recorded', async (_why, h) => {
    const id = await localId();
    from(h);
    const r = await confirmAction(revoke, id);
    expect(r).toMatchObject({ status: 'refused', reason: expect.stringContaining('localhost') });
    expect(rig.gl.state.writes).toEqual([]);
    expect(await listCommands(rig.db, 'ledgerline')).toEqual([]);
  });

  it.each(away)('preview refuses %s: it would read GitLab as the operator', async (_why, h) => {
    from(h);
    expect((await previewAction(revoke)).status).toBe('refused');
  });

  it('re-poll refuses a request from elsewhere and polls nothing', async () => {
    const refresh = vi.fn(() => Promise.resolve());
    at.rt = { refresh, last: null, snapshot: null };
    from({ host: 'evil.example:3000', origin: 'http://evil.example:3000' });
    expect(await repollAction('ledgerline')).toEqual({ ok: false, reason: expect.stringContaining('localhost') });
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each<Record<string, string>>([
    { host: 'localhost:3000', origin: 'http://localhost:3000' },
    { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
    { host: '[::1]:3000', origin: 'http://[::1]:3000' },
    { host: 'LOCALHOST' },
  ])('the operator’s own page on %o previews and confirms', async (h) => {
    from(h);
    const r = await previewAction(revoke);
    expect(r.status).toBe('preview');
    expect((await confirmAction(revoke, idOf(r))).status).toBe('done');
    expect(rig.gl.state.writes).toHaveLength(1);
  });

  it('demo mode is not held to it: the hosted replay is served under its own name, and demo never runs anything', async () => {
    vi.stubEnv('BELAY_MODE', 'demo');
    at.deps = { ...rig.deps, mode: 'demo', db: null };
    from({ host: 'belay-replay.example.run.app', origin: 'https://belay-replay.example.run.app' });
    const r = await previewAction(revoke);
    expect(r.status).toBe('preview');
    expect(await confirmAction(revoke, idOf(r))).toMatchObject({ status: 'done', results: [{ simulated: true }] });
    expect(rig.gl.state.writes).toEqual([]);
  });
});
