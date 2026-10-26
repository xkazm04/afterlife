// What a setup write plans and runs with: this machine's platform, its CLIs (providers' Exec: execFile, never a shell), a
// launcher that opens a window and returns once it started, the PATH, glab as the app resolves it, the env and the live
// runtime's restart. Injected, so the tests run every write against fakes: no installer, terminal or glab ever starts.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { restartRuntime, type RestartOutcome } from '@/server/data/live/runtime';
import { serverEnv, type Env } from '@/server/env/env';
import { defaultExec as glabExec } from '@/server/gitlab/adapter/exec';
import { readConfig, resolveGlabBin } from '@/server/gitlab/config';
import { defaultExec } from '@/server/providers/exec';
import type { Exec } from '@/server/providers/types';
import type { CommandOutcome, PreviewCommand } from '../types';

export type Platform = 'windows' | 'macos' | 'linux';
export type Launch = (bin: string, args: readonly string[]) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface SetupDeps {
  platform: Platform;
  exec: Exec;
  launch: Launch;
  /** Whether a program of this name is on the PATH (PATHEXT on Windows). */
  onPath: (bin: string) => boolean;
  /** glab as the app finds it (AFTERLIFE_GLAB, PATH, the winget location) and its version line; null when it does not answer. */
  glab: () => Promise<{ bin: string; version: string } | null>;
  /** The process env as it is (sourceOf reads the settings beside it). */
  env: Env;
  now: () => Date;
  restart: () => Promise<RestartOutcome>;
}

export const platformOf = (p: NodeJS.Platform = process.platform): Platform => (p === 'win32' ? 'windows' : p === 'darwin' ? 'macos' : 'linux');

/** Starts a window and resolves once it started (or could not): never waits for it to close. */
export const launchWindow: Launch = (bin, args) =>
  new Promise((resolve) => {
    const win = process.platform === 'win32';
    const child = spawn(bin, [...args], { stdio: 'ignore', detached: !win, windowsHide: win });
    child.once('spawn', () => {
      child.unref();
      resolve({ ok: true });
    });
    child.once('error', (e) => resolve({ ok: false, error: `cannot start ${bin}: ${e.message}` }));
  });

export function onPathOf(env: Env, platform: Platform, exists: (p: string) => boolean = existsSync): (bin: string) => boolean {
  const dirs = (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean);
  const exts = platform === 'windows' ? (env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';').filter(Boolean) : [''];
  return (bin) => dirs.some((d) => exts.some((x) => exists(path.join(d, bin + x))));
}

async function glabNow(env: Env): Promise<{ bin: string; version: string } | null> {
  const bin = await resolveGlabBin(readConfig(serverEnv(env)), glabExec, env);
  const r = await defaultExec(bin, ['--version'], { timeoutMs: 15_000 });
  return r.code === 0 ? { bin, version: r.stdout.trim().split(/\r?\n/)[0] ?? 'glab' } : null;
}

export function setupDeps(env: Env = process.env): SetupDeps {
  const platform = platformOf();
  return {
    platform, exec: defaultExec, launch: launchWindow, onPath: onPathOf(env, platform), glab: () => glabNow(env),
    env, now: () => new Date(), restart: () => restartRuntime(serverEnv(env)),
  };
}

/** A setup write's plan: what the preview shows, and the run its confirm does (only after the digest matched). */
export interface SetupPlan {
  title: string;
  summary: string;
  commands: PreviewCommand[];
  diff: string[];
  notes?: string[];
  /** Something the digest must cover besides the argv (the settings as read). */
  digestExtra?: string;
  run: () => Promise<CommandOutcome[]>;
}

/** Refused while planning: the reason is the answer. */
export class SetupRefused extends Error {}

export const outcome = (display: string, ok: boolean, extra: Partial<CommandOutcome> = {}): CommandOutcome =>
  ({ display, exit: ok ? 0 : 1, ok, simulated: false, ...extra });
