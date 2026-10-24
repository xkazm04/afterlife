// One child process, three ends: it exits, it times out (its whole TREE is killed), or it cannot start.
// Everything the runner spawns - git, gates, claude - goes through here, so "exit code asserted, never
// piped" and "kill the tree, not the shell" each live in exactly one place. Ported from ascent's kill-tree.
import { spawn, execFile } from 'node:child_process';

export interface ProcResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** stdout or stderr passed maxOutput and only its tail was kept. */
  truncated: boolean;
}

export interface ProcOptions {
  cwd?: string;
  /** Written to stdin, then stdin is closed. */
  input?: string;
  /** Default DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
  /** A shell is needed for gate command lines and for claude.cmd on Windows; argv must then be shell-safe. */
  shell?: boolean;
  /** Default childEnv(): no secrets. Only claude is spawned with agentEnv(). */
  env?: NodeJS.ProcessEnv;
  /** Characters kept per stream (the tail); default MAX_OUTPUT. A child cannot grow the runner's heap past a quarter more. */
  maxOutput?: number;
}

/** 32 MiB: a long claude stream-json fits, a gate printing in a loop does not take the runner down. */
export const MAX_OUTPUT = 32 * 1024 * 1024;

/** No child outlives this unless its caller sets timeoutMs: git runs hooks a lane agent can rewrite to hang. */
export const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

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

/**
 * Names a child must not inherit: forge and registry tokens, cloud keys, passwords, auth material (`*_AUTH`, npm's
 * `_auth`, the ssh agent's SSH_AUTH_SOCK), connection strings and DSNs (DATABASE_URL), and the model key.
 */
const SECRET_NAME = /(^|_)(TOKEN|SECRET|PASSWORD|PASSWD|PAT|API_?KEY|KEY|AUTH|CREDENTIALS?|COOKIE|DSN|DATABASE_URL|CONN(ECTION)?_?STR(ING)?)(_|$)/i;
/** A value holding a password in a URL (`postgres://u:pw@h`, `redis://:pw@h`), whatever its name. */
const SECRET_VALUE = /:\/\/[^\s/@:]*:[^\s/@]+@/;
/** What claude itself needs to authenticate (API key, OAuth token, Bedrock or Vertex). */
const AGENT_AUTH = /^(ANTHROPIC_|CLAUDE_CODE_)/i;
/**
 * The runner's own process state, never the child's: tsx's tsconfig and loader hooks (a fleet repo's own `npx tsx`
 * would load this repo's tsconfig and fail to resolve its paths), and npm's script context when started by `npm run`.
 */
const RUNNER_OWN = /^(TSX_|npm_|NODE_OPTIONS$|INIT_CWD$)/i;

function scrubbed(keep: (name: string) => boolean): NodeJS.ProcessEnv {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (keep(k) || (!SECRET_NAME.test(k) && !SECRET_VALUE.test(v ?? '') && !RUNNER_OWN.test(k))) out[k] = v;
  }
  return out as NodeJS.ProcessEnv;
}

/**
 * The env of every child but claude: gates, setup and git (whose hooks may live in the worktree, e.g. husky).
 * A lane agent edits the files those children run, so they get no secret at all; BELAY_PASS_ENV=A,B names
 * variables the operator hands through anyway (a private registry token for setup) - to these children only.
 */
export function childEnv(): NodeJS.ProcessEnv {
  const pass = new Set((process.env.BELAY_PASS_ENV ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
  return scrubbed((k) => pass.has(k.toUpperCase()));
}

/**
 * claude's env: the scrubbed env plus its own credentials (and AWS / Google ones when it runs on Bedrock / Vertex),
 * never a BELAY_PASS_ENV variable. CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1 makes claude strip those credentials again from
 * every process it starts (Bash, hooks), so a lane's allowed command - a gate script the lane rewrote - never sees
 * the key. Under it claude forces --permission-mode default, so the lane profile allows its edits by rule.
 */
export function agentEnv(): NodeJS.ProcessEnv {
  const bedrock = !!process.env.CLAUDE_CODE_USE_BEDROCK;
  const vertex = !!process.env.CLAUDE_CODE_USE_VERTEX;
  const env = scrubbed((k) => AGENT_AUTH.test(k) || (bedrock && /^AWS_/i.test(k)) || (vertex && /^GOOGLE_APPLICATION_CREDENTIALS$/i.test(k)));
  return { ...env, CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: '1' };
}

/** Children still running; killAll() ends them when the runner itself is stopped. */
const live = new Set<number>();

/** Kills every live child tree. Lanes are detached on POSIX, so a Ctrl-C to the runner never reaches them. */
export async function killAll(): Promise<void> {
  await Promise.all([...live].map((pid) => killTree(pid)));
}

/**
 * A stream's last `max` characters. Chunks are kept as they come and cut back to `max` only once a quarter more has
 * piled up, so a child flooding past the cap costs linear time, not one copy of the whole tail per chunk.
 */
function tailBuffer(max: number) {
  let parts: string[] = [];
  let len = 0;
  let cut = false;
  const compact = (): string => {
    const all = parts.join('');
    const kept = all.length > max ? all.slice(-max) : all;
    if (kept.length < all.length) cut = true;
    parts = [kept];
    len = kept.length;
    return kept;
  };
  return {
    push(s: string): void {
      parts.push(s);
      len += s.length;
      if (len > max + (max >> 2)) compact();
    },
    text: compact,
    cut: (): boolean => cut,
  };
}

export function runProc(cmd: string, args: string[], opts: ProcOptions = {}): Promise<ProcResult> {
  return new Promise((resolve) => {
    let timedOut = false;
    const max = opts.maxOutput ?? MAX_OUTPUT;
    const out = tailBuffer(max);
    const err = tailBuffer(max);
    let settled = false;
    const done = (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (child.pid) live.delete(child.pid);
      const stdout = out.text();
      const stderr = err.text();
      resolve({ code, stdout, stderr, timedOut, truncated: out.cut() || err.cut() });
    };
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? childEnv(),
      shell: opts.shell ?? false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (child.pid) live.add(child.pid);
    const timer = setTimeout(() => {
      timedOut = true;
      void killTree(child.pid).then(() => done(null));
    }, opts.timeoutMs || DEFAULT_TIMEOUT_MS);
    // Decoded per stream, so a multibyte character split across two chunks arrives whole.
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d: string) => out.push(d));
    child.stderr.on('data', (d: string) => err.push(d));
    child.on('error', (e) => {
      err.push(String(e));
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
