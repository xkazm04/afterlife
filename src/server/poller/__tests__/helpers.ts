// Shared by the poller's tests: a fresh index polled against the demo GitLab, and a port that fails on demand.
import type { PGlite } from '@electric-sql/pglite';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import type { GitLabPort } from '@/server/gitlab/port';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { SEED_NOW } from '@/server/index/seed/parse';
import { readPollerConfig, type PollerConfig } from '../config';
import { runPollCycle, type CycleResult } from '../cycle';
import { createMemory, type PollMemory } from '../state';

/** The demo's 14:22, and the instant the demo GitLab's relative times are measured from. */
export const NOW = SEED_NOW;
export const cfg = (): PollerConfig => readPollerConfig(144060371, {});

export interface Rig {
  gl: FakeGitLab;
  db: PGlite;
  mem: PollMemory;
  poll: (at?: Date, port?: GitLabPort) => Promise<CycleResult>;
}

export async function rig(): Promise<Rig> {
  const gl = createDemoGitLab(NOW);
  const db = await memoryIndex();
  const mem = createMemory();
  return { gl, db, mem, poll: (at = NOW, port = gl.port) => runPollCycle(port, db, at, { cfg: cfg(), mem }) };
}

/** The same port, except that one read throws. */
export function failing<K extends keyof GitLabPort>(port: GitLabPort, method: K, message = 'glab: 502 Bad Gateway (HTTP 502)'): GitLabPort {
  return new Proxy(port, {
    get: (t, k, r) => (k === method ? () => Promise.reject(new Error(message)) : Reflect.get(t, k, r)),
  });
}

export const mrOf = (gl: FakeGitLab, iid: number) => {
  const mr = gl.state.projects.flatMap((p) => p.mrs).find((m) => m.iid === iid);
  if (!mr) throw new Error(`no !${iid}`);
  return mr;
};
export const notesOf = (gl: FakeGitLab, iid: number) => gl.state.projects.find((p) => p.raw.name === 'ledgerline')?.notes[String(iid)] ?? [];
