// One child process, three ends: it exits, it times out (its whole TREE is killed), or it cannot start.
// Everything the runner spawns - git, gates, claude - goes through here, so "exit code asserted, never
// piped" and "kill the tree, not the shell" each live in exactly one place. Ported from ascent's kill-tree.
import { spawn, execFile } from 'node:child_process';

export interface ProcResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface ProcOptions {
  cwd?: string;
  /** Written to stdin, then stdin is closed. */
  input?: string;
  timeoutMs?: number;
  /** A shell is needed for gate command lines and for claude.cmd on Windows; argv must then be shell-safe. */
  shell?: boolean;
  env?: NodeJS.ProcessEnv;
}

/** taskkill /T /F on Windows (the only thing that reaches grandchildren), the process group elsewhere. */
export function killTree(pid: number | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (!pid || !Number.isInteger(pid) || pid <= 0) return resolve();
    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, timeout: 5000 }, () => resolve());
      return;
    }
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
    resolve();
  });
}

export function runProc(cmd: string, args: string[], opts: ProcOptions = {}): Promise<ProcResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const done = (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    };
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      shell: opts.shell ?? false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (opts.timeoutMs) {
      timer = setTimeout(() => {
        timedOut = true;
        void killTree(child.pid).then(() => done(null));
      }, opts.timeoutMs);
    }
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
    child.on('error', (e) => {
      stderr += String(e);
      done(null);
    });
    child.on('close', (code) => done(code));
    child.stdin.on('error', () => undefined);
    child.stdin.end(opts.input ?? '');
  });
}

/** git in `cwd`; resolves stdout trimmed, rejects with git's own message on a non-zero exit. */
export async function git(cwd: string, args: string[]): Promise<string> {
  const r = await runProc('git', ['-C', cwd, ...args]);
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} failed (${r.code}): ${(r.stderr || r.stdout).trim()}`);
  return r.stdout.trim();
}
