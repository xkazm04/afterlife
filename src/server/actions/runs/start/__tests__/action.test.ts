// startRunAction is a public endpoint: the hosted replay, a request not addressed to this machine and an intent that
// does not validate are refused before anything is read (no fleet, no git, no spawn).
import { afterEach, describe, expect, it, vi } from 'vitest';

const hit = vi.hoisted(() => ({ spawn: 0, headers: new Headers({ host: 'localhost:3000' }) }));
vi.mock('node:child_process', () => {
  const no = () => { hit.spawn++; throw new Error('a process was spawned'); };
  return { execFile: no, spawn: no, exec: no, execSync: no, execFileSync: no, spawnSync: no, fork: no };
});
vi.mock('next/headers', () => ({ headers: async () => hit.headers }));

const { startRunAction } = await import('../startRunAction');
const intent = { kind: 'start-run', repo: 'grinex-portal', mode: 'propose', waves: 1, lanes: 6, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet', ideas: [] };

afterEach(() => {
  vi.unstubAllEnvs();
  hit.headers = new Headers({ host: 'localhost:3000' });
});

describe('startRunAction', () => {
  it('refuses on the hosted replay, preview and confirm', async () => {
    vi.stubEnv('AFTERLIFE_MODE', 'replay');
    expect(await startRunAction(intent)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/hosted replay starts no run/) });
    expect(await startRunAction(intent, 'f'.repeat(64))).toMatchObject({ status: 'refused' });
  });
  it('refuses a request that is not addressed to this machine', async () => {
    hit.headers = new Headers({ host: 'afterlife.example.com' });
    expect(await startRunAction(intent)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/not localhost/) });
  });
  it('refuses an intent that does not validate, and a confirm with no preview id shape', async () => {
    expect(await startRunAction({ ...intent, onto: 'x' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/propose mode changes no branch/) });
    expect(await startRunAction(intent, 42)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/preview first/) });
    expect(await startRunAction(intent, 'not-a-digest')).toMatchObject({ status: 'refused', reason: expect.stringMatching(/preview first/) });
  });
  it('spawned nothing', () => expect(hit.spawn).toBe(0));
});
