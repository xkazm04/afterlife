// The hosted replay (BELAY_MODE=replay) is demo on every path. Each of the five server actions is a public endpoint there,
// so each is called as an anonymous caller would, in replay, demo and with BELAY_MODE unset, and must spawn nothing (no
// glab, no git), open no index (PGlite), reach no network, write no file, start no poll and execute nothing. Boot, too:
// the instrumentation hook starts no runtime. A guard, not a fix: it passes on the code as it was (questions 1 and 4).
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const hit = vi.hoisted(() => ({ spawn: 0, pglite: 0, refresh: 0, start: 0 }));
vi.mock('node:child_process', () => {
  const no = () => { hit.spawn++; throw new Error('a process was spawned'); };
  return { execFile: no, spawn: no, exec: no, execSync: no, execFileSync: no, spawnSync: no, fork: no };
});
vi.mock('@electric-sql/pglite', () => ({ PGlite: class { constructor() { hit.pglite++; throw new Error('PGlite was opened'); } } }));
// A caller off this machine, through a proxy: whatever demo answers, it is not because the request looked local.
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'replay.example.run.app', 'x-forwarded-for': '203.0.113.7' }) }));
vi.mock('next/cache', () => ({ refresh: () => { hit.refresh++; } }));
vi.mock('@/server/data/live/runtime', async (orig) => ({ ...(await orig<object>()), startRuntime: () => { hit.start++; throw new Error('a runtime was started'); } }));

const { confirmAction, previewAction } = await import('../../actions');
const { repollAction } = await import('../../repollAction');
const { verifyArmAction } = await import('../../arm/verifyAction');
const { rereadSetupAction } = await import('@/server/data/setup/rereadAction');
const { register } = await import('@/instrumentation');
const { actionDeps } = await import('../../deps');

const writes = ['writeFileSync', 'writeFile', 'mkdirSync', 'mkdir', 'appendFileSync', 'rmSync', 'renameSync', 'openSync'] as const;
const fetchSpy = vi.fn(() => Promise.reject(new Error('the network was reached')));
beforeAll(() => {
  for (const m of writes) vi.spyOn(fs, m).mockImplementation(() => { throw new Error(`fs.${m}`); });
  syncBuiltinESMExports();
  vi.stubGlobal('fetch', fetchSpy);
});
afterAll(() => { vi.restoreAllMocks(); syncBuiltinESMExports(); vi.unstubAllGlobals(); });
afterEach(() => vi.unstubAllEnvs());

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };
const arm = { kind: 'disarm-track', project: 'ledgerline', track: 'T4' }; // the demo's T4 is armed already
const gap = { kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g9', stage: 'secure', from: 1, to: 2, title: 'x', branch: 'belay/gap-g9', files: [{ path: 'n/x.yml', content: 'a: 1\n' }] };

describe.each([['replay'], ['demo'], [undefined]])('BELAY_MODE=%s', (mode) => {
  it('every server action answers as demo and touches nothing', async () => {
    vi.stubEnv('BELAY_MODE', mode);
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const port = actionDeps()?.port;
    const execute = vi.spyOn(port!, 'execute');
    for (const intent of [revoke, arm, gap]) {
      const p = await previewAction(intent);
      if (p.status !== 'preview') throw new Error(`${intent.kind}: ${p.status} ${'reason' in p ? p.reason : ''}`);
      expect(p.preview.mode).toBe('demo');
      const c = await confirmAction(intent, p.preview.previewId);
      expect(c).toMatchObject({ status: 'done' });
      expect(c.status === 'done' && c.results.every((r) => r.simulated)).toBe(true);
    }
    expect(await repollAction('ledgerline')).toEqual({ ok: false, reason: 'demo mode has nothing to poll' });
    expect(await verifyArmAction(arm)).toMatchObject({ status: 'simulated' });
    expect(await rereadSetupAction('doctor')).toMatchObject({ status: 'refused', reason: expect.stringMatching(/^demo mode/) });
    await register();
    expect(execute).not.toHaveBeenCalled();
    expect(hit).toEqual({ spawn: 0, pglite: 0, refresh: 0, start: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
    for (const m of writes) expect(fs[m]).not.toHaveBeenCalled();
  });
});
