// Runs the model-free Belay engine CLI (docs/BACKEND-PLAN.md section 3): `tsx engine/cli.ts <cmd>` inside the
// engine checkout. stdout is JSON, stderr is for humans, exit 0 pass / 1 fail / 2 inconclusive or error.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * How to start tsx in `dir`. The checkout's own tsx is run with this node: `npx` resolves the same binary but costs about a
 * second per call (1.2-1.5 s against 0.3 s measured), and one gate run makes three calls. Without a local tsx, `npx` as before.
 */
export function tsxCommand(dir) {
  const cli = path.join(dir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (fs.existsSync(cli)) return { cmd: process.execPath, args: [cli], shell: false };
  return { cmd: 'npx', args: ['tsx'], shell: process.platform === 'win32' };
}

export function engine(args) {
  const dir = process.env.BELAY_DIR;
  if (!dir) throw new Error('BELAY_DIR is not set (the engine checkout)');
  const { cmd, args: pre, shell } = tsxCommand(dir);
  const r = spawnSync(cmd, [...pre, 'engine/cli.ts', ...args], { cwd: dir, encoding: 'utf8', maxBuffer: 64 << 20, shell });
  if (r.stderr) process.stderr.write(r.stderr);
  return { code: r.status ?? 2, stdout: r.stdout ?? '' };
}
