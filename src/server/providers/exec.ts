// Starts the provider CLIs: execFile, never a shell, so a KQL pipe or a JMESPath quote is never parsed twice.
// On Windows `az` is az.cmd, which execFile cannot start without a shell; az.cmd only runs
// `<install>\python.exe -IBm azure.cli %*`, so we run that python directly (BELAY_AZ_PYTHON overrides the path).
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Exec } from './types';

const MAX_BUFFER = 64 * 1024 * 1024;
const WIN_AZ_PYTHON = 'C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\python.exe';

/** The argv that actually starts `bin`: az on Windows becomes its own python with `-IBm azure.cli`. `-X utf8`
 * because -I ignores PYTHONIOENCODING, and cp1252 drops what it cannot encode ("Swap Staging → Production"). */
export function resolveBin(bin: string, args: readonly string[], platform = process.platform): { file: string; args: string[] } {
  if (bin === 'az' && platform === 'win32') {
    const py = process.env.BELAY_AZ_PYTHON ?? WIN_AZ_PYTHON;
    if (existsSync(py)) return { file: py, args: ['-X', 'utf8', '-IBm', 'azure.cli', ...args] };
  }
  if (bin === 'glab' && platform === 'win32' && !path.extname(bin)) return { file: 'glab.exe', args: [...args] };
  return { file: bin, args: [...args] };
}

/** Resolves on any exit code; a binary that cannot start resolves with code 127 and the reason in stderr. */
export const defaultExec: Exec = (bin, args, opts = {}) =>
  new Promise((resolve) => {
    const t0 = Date.now();
    const r = resolveBin(bin, args);
    // az writes cp1252 on a Windows console and drops what it cannot encode; force UTF-8 so names survive.
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8', AZURE_CORE_NO_COLOR: 'true', AZURE_CORE_ONLY_SHOW_ERRORS: 'true', GLAB_NO_PROMPT: '1' };
    execFile(r.file, r.args, { encoding: 'utf8', windowsHide: true, maxBuffer: MAX_BUFFER, timeout: opts.timeoutMs ?? 90_000, cwd: opts.cwd, env }, (err, stdout, stderr) => {
      const ms = Date.now() - t0;
      if (!err) return resolve({ code: 0, stdout, stderr, ms });
      const e = err as NodeJS.ErrnoException & { killed?: boolean };
      if (typeof e.code === 'number') return resolve({ code: e.code, stdout, stderr, ms });
      if (e.killed) return resolve({ code: 124, stdout, stderr: `${stderr}\n${bin}: timed out`, ms });
      resolve({ code: 127, stdout, stderr: `cannot start ${bin}: ${e.code ?? e.message}`, ms });
    });
  });

/** A lapsed or missing login, told apart from any other failure so a probe can name the re-login command. */
export function loginHint(bin: 'az' | 'glab', stderr: string): string | undefined {
  if (bin === 'az' && /az login|AADSTS|expired|refresh token|Please run 'az login'/i.test(stderr)) return 'az login';
  if (bin === 'glab' && /401|unauthori[sz]ed|glab auth login|not logged/i.test(stderr)) return 'glab auth login';
  return undefined;
}
