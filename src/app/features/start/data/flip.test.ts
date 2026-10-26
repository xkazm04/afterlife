// set-setup flips a demo server to live in-process: the confirm writes the settings and restarts the runtime (on the
// seeded fake GitLab, so nothing real is read), and the next probe's facts read live, with the first poll's projects.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetupDeps } from '@/server/actions/setup/context';
import { clearSetupWrites, confirmSetupWrite, previewSetupWrite } from '@/server/actions/setup/run';
import { readyRuntime, restartRuntime } from '@/server/data/live/runtime';
import { serverEnv } from '@/server/env/env';
import type { SetupIntent } from '@/server/start/wire';
import { probeDeps } from './probe';

const holder = globalThis as unknown as Record<symbol, unknown>;
const reset = (): void => {
  readyRuntime()?.scheduler?.stop();
  for (const k of ['starting', 'ready', 'failed', 'restarting', 'restarted']) delete holder[Symbol.for(`belay.liveRuntime.${k}`)];
};

let dir = '';
beforeEach(() => {
  reset();
  clearSetupWrites();
  dir = mkdtempSync(path.join(tmpdir(), 'afterlife-flip-'));
  vi.stubEnv('AFTERLIFE_DATA_DIR', dir);
  vi.stubEnv('BELAY_GITLAB', 'fake');
  vi.stubEnv('BELAY_MODE', '');
  vi.stubEnv('AFTERLIFE_MODE', '');
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  reset();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('set-setup on a demo server', () => {
  it('turns it live in-process, and the next probe reads live', async () => {
    expect(probeDeps().facts.mode).toBe('demo');
    const deps: SetupDeps = {
      platform: 'linux', exec: () => Promise.reject(new Error('no exec in this test')), launch: () => Promise.reject(new Error('no launch')),
      onPath: () => false, glab: async () => null, env: process.env, now: () => new Date(), restart: () => restartRuntime(serverEnv(), () => undefined),
    };
    const intent: SetupIntent = { kind: 'set-setup', groupId: '144060371', mode: 'live' };
    const p = await previewSetupWrite(deps, intent);
    if (p.status !== 'preview') throw new Error(JSON.stringify(p));
    const r = await confirmSetupWrite(deps, intent, p.preview.previewId);
    expect(r).toMatchObject({ status: 'done', results: [{ ok: true }, { ok: true, made: expect.stringMatching(/^live: first poll finished, \d+ project\(s\)$/) }] });
    const facts = probeDeps().facts;
    expect([facts.mode, facts.gate, facts.projects! > 0]).toEqual(['live', null, true]);
  });
});
