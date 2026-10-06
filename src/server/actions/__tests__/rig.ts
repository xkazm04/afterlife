// A live-mode action rig: the demo GitLab as the port, a seeded and polled in-memory index, and a refresh that counts.
import type { PGlite } from '@electric-sql/pglite';
import { vi } from 'vitest';
import { GitLabError } from '@/server/gitlab/errors';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import type { GitLabPort } from '@/server/gitlab/port';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import type { ActionDeps } from '../run';

export interface ActionRig {
  gl: FakeGitLab;
  db: PGlite;
  deps: ActionDeps;
  refresh: ReturnType<typeof vi.fn>;
}

export async function liveRig(wrapPort: (p: GitLabPort) => GitLabPort = (p) => p): Promise<ActionRig> {
  const gl = createDemoGitLab(SEED_NOW);
  const db = await memoryIndex();
  await seedDemo(db);
  const cfg = readPollerConfig(144060371, {});
  await runPollCycle(gl.port, db, SEED_NOW, { cfg });
  const refresh = vi.fn(() => Promise.resolve());
  const deps: ActionDeps = {
    mode: 'live', port: wrapPort(gl.port), db, groupId: 144060371, cfg, now: () => SEED_NOW, refresh,
    gitlabId: async (id) => (await getProjectRow(db, id))?.gitlabId ?? null,
  };
  return { gl, db, deps, refresh };
}

/** The same port, except that the nth execute (1-based) throws. */
export function failingExecute(n: number): (p: GitLabPort) => GitLabPort {
  return (port) => {
    let calls = 0;
    return new Proxy(port, {
      get: (t, k, r) => (k === 'execute' ? (c: Parameters<GitLabPort['execute']>[0]) => (++calls === n ? Promise.reject(new GitLabError('forbidden', '403 Forbidden', 'api', 403)) : t.execute(c)) : Reflect.get(t, k, r)),
    });
  };
}

export const policyFiles = (gl: FakeGitLab): Record<string, string> => {
  const p = gl.state.projects.find((x) => x.raw.name === 'belay-policy');
  if (!p) throw new Error('no policy project');
  return p.files;
};
