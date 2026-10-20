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
  /** The red gate's stdout then stderr, ANSI stripped, at most GATE_TAIL_CHARS from the end; absent when ok or silent. */
  tail?: string;
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
  const text = [clean(stdout), clean(stderr)].filter(Boolean).join('\n');
  return text.length > max ? `...${text.slice(-max)}` : text;
}

/** `<what> red: <gate> (exit N)` then the red gate's output tail on the following lines. */
export const redReason = (what: string, v: GateVerdict): string => `${what} red: ${v.failed ?? '?'}${v.tail ? `\n${v.tail}` : ''}`;

export async function runGates(gates: string[], cwd: string, timeoutMs: number): Promise<GateVerdict> {
  for (const gate of gates) {
    const r = await runProc(gate, [], { cwd, shell: true, timeoutMs });
    if (r.code !== 0) {
      const tail = gateTail(r.stdout, r.stderr);
      return { ok: false, failed: `${gate} (${r.timedOut ? 'timed out' : `exit ${r.code}`})`, ...(tail ? { tail } : {}) };
    }
  }
  return { ok: true };
}
