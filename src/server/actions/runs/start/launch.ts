// The real effects of a start-run, for the running server: the detached launch and the deps the plan reads through.
// The launch is `node cli/belay.mjs run ...` (this very node binary), detached, with no window and no stdin, its stdout
// and stderr appended to the launch log; it is unref'd, so the confirm answers at once and the run outlives the request.
import 'server-only';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { defaultRunsRoot } from '@/server/runs/readRuns';
import { branchesAt, liveRunPid } from './git';
import type { StartDeps } from './plan';
import { runRepos } from './read';

export function launchDetached(argv: string[], cwd: string, log: string): Promise<{ pid: number }> {
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const fd = fs.openSync(log, 'a');
  let open = true;
  const close = () => {
    if (open) fs.closeSync(fd); // the child holds its own copy of the descriptor
    open = false;
  };
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(process.execPath, argv, { cwd, detached: true, windowsHide: true, stdio: ['ignore', fd, fd], env: process.env });
    } catch (e) {
      close();
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    child.once('error', (e) => {
      close();
      reject(e); // a no-op once 'spawn' resolved
    });
    child.once('spawn', () => {
      close();
      child.unref();
      if (child.pid === undefined) reject(new Error('the run started without a pid'));
      else resolve({ pid: child.pid });
    });
  });
}

export function startDeps(): StartDeps {
  const afterlife = process.cwd();
  return {
    now: () => new Date(),
    afterlife,
    dataDir: path.resolve(defaultRunsRoot()),
    repos: () => runRepos(afterlife),
    exists: (p) => fs.existsSync(p),
    branches: branchesAt,
    liveRun: (repo) => liveRunPid(repo),
    launch: launchDetached,
  };
}
