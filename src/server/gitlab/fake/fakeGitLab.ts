// The fake GitLab: the real glab adapter wired to an in-memory `glab api` server. Reads, error
// shapes and writes (through execute) go through the same code as live, so the contract tests
// cover both. Used by tests and by the live-mode demo.
import { createGlabAdapter } from '../adapter/glabAdapter';
import type { ExecFn } from '../adapter/exec';
import type { GitLabPort } from '../port';
import { seedState, type FakeState, type SeedOptions } from './dataset';
import { readRoutes } from './reads';
import { dispatch, toExec } from './server';
import { writeRoutes } from './writes';

export interface FakeGitLab {
  port: GitLabPort;
  /** The in-memory GitLab; tests read it to see what a write changed. */
  state: FakeState;
  exec: ExecFn;
}

export interface FakeOptions extends SeedOptions {
  host?: string;
  pageSize?: number;
}

const ROUTES = [...readRoutes, ...writeRoutes];

export function createFakeGitLab(o: FakeOptions = {}): FakeGitLab {
  const state = seedState(o);
  const exec: ExecFn = async (_file, args) => toExec(dispatch(ROUTES, state, args));
  const port = createGlabAdapter({ bin: 'glab', exec, host: o.host, pageSize: o.pageSize, sleep: async () => undefined });
  return { port, state, exec };
}
