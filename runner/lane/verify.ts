// The gates: each fleet gate is its own spawn in the worktree, its exit code asserted, its output never
// piped through anything that could swallow a failure. All green or the lane does not commit. A red gate's
// last output is kept (ANSI stripped) so a park reason says what went red, not just which gate.
import { runProc } from '../proc/proc';

/** Characters of a red gate's output kept for the run file and the reflect step. */
export const GATE_TAIL_CHARS = 1200;

export interface GateVerdict {
  ok: boolean;
  /** The first red gate's command and how it went red; absent when ok. */
  failed?: string;
  /** The red gate's stdout tail then its stderr tail, ANSI stripped, at most GATE_TAIL_CHARS in all; absent when ok or silent. */
  tail?: string;
  /** Gates that went red, then green when rerun once: load flakes, recorded so they are seen and not hidden. */
  flaky?: string[];
}

const ANSI = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;

/** A gate's output, terminal colour and cursor codes removed, carriage-return overwrites resolved to their last frame. */
export function gateTail(stdout: string, stderr: string, max = GATE_TAIL_CHARS): string {
  const clean = (s: string) =>
    s
      .replace(ANSI, '')
      .split('\n')
      .map((l) => l.split('\r').filter(Boolean).pop() ?? '')
      .join('\n')
      .trim();
  // Each stream keeps its own tail: a test runner reports its failures on stdout, and warning noise on stderr
  // (a runtime's ExperimentalWarning, a deprecation) must not push them out. stderr gets a third when both speak.
  const out = clean(stdout);
  const err = clean(stderr);
  const cut = (s: string, n: number) => (s.length > n ? `...${s.slice(-n)}` : s);
  if (!out || !err) return cut(out || err, max);
  const errMax = Math.max(Math.floor(max / 3), max - out.length);
  return `${cut(out, max - Math.min(err.length, errMax))}\n${cut(err, errMax)}`;
}

/** `<what> red: <gate> (exit N)` then the red gate's output tail on the following lines. */
export const redReason = (what: string, v: GateVerdict): string => `${what} red: ${v.failed ?? '?'}${v.tail ? `\n${v.tail}` : ''}`;

/**
 * Each gate in order; the first red one ends the run. With `retries`, a red gate is rerun (alone) up to that many
 * times before it counts: under fleet load a test timeout or an aborted socket is not a red (the operator's rule),
 * and a lane must not be failed by one. A gate green on a rerun is named in `flaky`; a gate red on every run is red.
 */
export async function runGates(gates: string[], cwd: string, timeoutMs: number, retries = 0): Promise<GateVerdict> {
  const flaky: string[] = [];
  for (const gate of gates) {
    for (let attempt = 0; ; attempt++) {
      const r = await runProc(gate, [], { cwd, shell: true, timeoutMs });
      if (r.code === 0) {
        if (attempt > 0) flaky.push(gate);
        break;
      }
      if (attempt < retries) continue;
      const tail = gateTail(r.stdout, r.stderr);
      return { ok: false, failed: `${gate} (${r.timedOut ? 'timed out' : `exit ${r.code}`}${attempt ? `, ${attempt + 1} runs` : ''})`, ...(tail ? { tail } : {}), ...(flaky.length ? { flaky } : {}) };
    }
  }
  return flaky.length ? { ok: true, flaky } : { ok: true };
}

/** Gate reruns allowed before a gate counts as red (setup is never rerun: an install that fails is not load). */
export const GATE_RETRIES = 1;
