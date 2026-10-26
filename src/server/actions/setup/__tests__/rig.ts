// A setup-write rig: a temp data folder, a fake exec and launcher that record every argv, a fake glab and PATH, and a
// restart that only counts. Nothing here can start an installer, a terminal or glab.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import type { RestartOutcome } from '@/server/data/live/runtime';
import type { SetupDeps } from '../context';
import { clearSetupWrites } from '../run';

export interface SetupRig {
  dir: string;
  execs: string[][];
  launches: string[][];
  restarts: number;
  glab: { bin: string; version: string } | null;
  path: Set<string>;
  restartTo: RestartOutcome;
  exitCode: number;
  deps: SetupDeps;
}

export function setupRig(platform: SetupDeps['platform'] = 'windows'): SetupRig {
  const rig = { execs: [], launches: [], path: new Set<string>() } as unknown as SetupRig;
  beforeEach(() => {
    clearSetupWrites();
    rig.dir = mkdtempSync(path.join(tmpdir(), 'afterlife-setup-'));
    rig.execs.length = 0;
    rig.launches.length = 0;
    rig.restarts = 0;
    rig.glab = null;
    rig.path = new Set(['winget', 'brew']);
    rig.restartTo = { mode: 'live', ok: true, projects: 3 };
    rig.exitCode = 0;
    rig.deps = {
      platform,
      exec: async (bin, args) => {
        rig.execs.push([bin, ...args]);
        return { code: rig.exitCode, stdout: 'ok', stderr: rig.exitCode ? 'installer said no' : '', ms: 1 };
      },
      launch: async (bin, args) => {
        rig.launches.push([bin, ...args]);
        return { ok: true };
      },
      onPath: (bin) => rig.path.has(bin),
      glab: async () => rig.glab,
      env: { AFTERLIFE_DATA_DIR: path.join(rig.dir, 'data') },
      now: () => new Date('2026-10-26T10:00:00Z'),
      restart: async () => {
        rig.restarts += 1;
        return rig.restartTo;
      },
    };
  });
  afterEach(() => rmSync(rig.dir, { recursive: true, force: true }));
  return rig;
}
