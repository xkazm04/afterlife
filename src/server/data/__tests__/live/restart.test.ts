// restartRuntime: /start's set-setup starts the live runtime again in-process on the settings as they read now. On the
// persistent index (one cache for every group this machine polled) the snapshot after a group change holds only the new
// group's projects; demo only drops the runtime; two restarts in flight share one.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeSettings } from '@/server/env/settings';
import { readConfig } from '@/server/gitlab/config';
import { project } from '@/server/gitlab/fake/dataset';
import { createFakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { getIndex } from '@/server/index/db';
import { readDataConfig } from '../../config';
import { replayClock } from '../../live/clock';
import { createLivePort } from '../../live/ports';
import { readyRuntime, restartRuntime, startRuntime } from '../../live/runtime';

vi.mock('../../live/ports', async (orig) => ({ ...(await orig<object>()), createLivePort: vi.fn() }));
vi.mock('@/server/index/db', async (orig) => ({ ...(await orig<object>()), getIndex: vi.fn() }));

const holder = globalThis as unknown as Record<symbol, unknown>;
const KEYS = ['starting', 'ready', 'failed', 'restarting', 'restarted'].map((k) => Symbol.for(`belay.liveRuntime.${k}`));
const reset = (): void => {
  readyRuntime()?.scheduler?.stop();
  for (const k of KEYS) delete holder[k];
};
const quiet = (): void => undefined;

/** Group 777 "beta" with one project, beta/api; the recorded group (afterlife3274741) is the fake's default. */
const beta = () =>
  createFakeGitLab({
    custom: {
      group: { id: 777, name: 'beta', path: 'beta', full_path: 'beta', web_url: 'https://gitlab.com/groups/beta' },
      projects: [project({ id: 5001, name: 'api', path: 'api', path_with_namespace: 'beta/api', default_branch: 'main', web_url: 'https://gitlab.com/beta/api', visibility: 'private', archived: false })],
    },
  });

let dir = '';
let db: PGlite;
beforeEach(async () => {
  reset();
  dir = mkdtempSync(path.join(tmpdir(), 'afterlife-restart-'));
  vi.stubEnv('AFTERLIFE_DATA_DIR', dir);
  vi.spyOn(console, 'warn').mockImplementation(quiet);
  db = await memoryIndex(); // stands in for the persistent index: shared by every runtime this process starts
  vi.mocked(getIndex).mockResolvedValue(db);
  const alpha = createFakeGitLab();
  const other = beta();
  vi.mocked(createLivePort).mockReset().mockImplementation(async () => ({ port: readConfig().groupId === '777' ? other.port : alpha.port, clock: replayClock, seeded: false }));
});
afterEach(() => {
  reset();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const ids = (): string[] => readyRuntime()?.snapshot?.data.fleet.projects.map((p) => p.id).sort() ?? [];

describe('restartRuntime', () => {
  it('after a group change, serves only the new group\'s projects from the same index', async () => {
    writeSettings({ mode: 'live', groupId: '144060371', project: 'ledgerline', proofAuthors: 'op' });
    const first = await startRuntime(readDataConfig(), quiet);
    expect(ids()).toContain('ledgerline');
    writeSettings({ groupId: '777', project: 'api' });
    const out = await restartRuntime(undefined, quiet);
    expect(out).toEqual({ mode: 'live', ok: true, projects: 1 });
    expect(readyRuntime()).not.toBe(first);
    expect(readyRuntime()?.db).toBe(db); // the same index: the old group's rows are still in it
    expect(ids()).toEqual(['api']);
    expect(readyRuntime()?.snapshot?.data.portfolio.group).toBe('beta');
  });

  it('a failed new start is the outcome, kept for the pages, with no runtime ready', async () => {
    writeSettings({ mode: 'live', groupId: '144060371', project: 'ledgerline', proofAuthors: 'op' });
    await startRuntime(readDataConfig(), quiet);
    writeSettings({ proofAuthors: undefined });
    const out = await restartRuntime(undefined, quiet);
    expect(out).toMatchObject({ mode: 'live', ok: false, reason: expect.stringMatching(/PROOF_AUTHORS is not set/) });
    expect(readyRuntime()).toBeNull();
  });

  it('demo mode drops the runtime and stops its scheduler', async () => {
    writeSettings({ mode: 'live', groupId: '144060371', project: 'ledgerline', proofAuthors: 'op' });
    const rt = await startRuntime(readDataConfig(), quiet);
    const stop = vi.spyOn(rt.scheduler!, 'stop');
    writeSettings({ mode: 'demo' });
    expect(await restartRuntime(undefined, quiet)).toEqual({ mode: 'demo' });
    expect([readyRuntime(), stop.mock.calls.length]).toEqual([null, 1]);
  });

  it('two restarts in flight share one', async () => {
    writeSettings({ mode: 'live', groupId: '777', project: 'api', proofAuthors: 'op' });
    const a = restartRuntime(undefined, quiet);
    const b = restartRuntime(undefined, quiet);
    expect(b).toBe(a);
    await a;
    expect(vi.mocked(createLivePort)).toHaveBeenCalledTimes(1);
    expect(ids()).toEqual(['api']);
  });
});
