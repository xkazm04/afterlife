// How belay reports a child that did not exit by itself. Exit 2 is the engine's 'inconclusive or error' (engine/cli.ts), so a
// spawn that never started or a run stopped by a signal must say what happened and, for a signal, use the shell's 128+n.
import os from 'node:os';

/** `r` is a spawnSync result. Returns the exit code and, when the child did not report a status itself, one line for stderr. */
export function childExit(verb, r) {
  if (r.error) return { code: 2, message: `belay ${verb}: ${r.error.message}` };
  if (r.signal) {
    const n = os.constants.signals[r.signal];
    return { code: n ? 128 + n : 2, message: `belay ${verb}: stopped by ${r.signal}` };
  }
  return { code: r.status ?? 2, message: null };
}
