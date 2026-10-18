// The gates: each fleet gate is its own spawn in the worktree, its exit code asserted, its output never
// piped through anything that could swallow a failure. All green or the lane does not commit.
import { runProc } from '../proc/proc';

export interface GateVerdict {
  ok: boolean;
  /** The first red gate's command and how it went red; absent when ok. */
  failed?: string;
}

export async function runGates(gates: string[], cwd: string, timeoutMs: number): Promise<GateVerdict> {
  for (const gate of gates) {
    const r = await runProc(gate, [], { cwd, shell: true, timeoutMs });
    if (r.code !== 0) return { ok: false, failed: `${gate} (${r.timedOut ? 'timed out' : `exit ${r.code}`})` };
  }
  return { ok: true };
}
