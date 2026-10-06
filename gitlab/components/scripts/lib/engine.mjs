// Runs the model-free Belay engine CLI (docs/BACKEND-PLAN.md section 3): `npx tsx engine/cli.ts <cmd>` inside the
// engine checkout. stdout is JSON, stderr is for humans, exit 0 pass / 1 fail / 2 inconclusive or error.
import { spawnSync } from 'node:child_process';

export function engine(args) {
  const dir = process.env.BELAY_DIR;
  if (!dir) throw new Error('BELAY_DIR is not set (the engine checkout)');
  const r = spawnSync('npx', ['tsx', 'engine/cli.ts', ...args], { cwd: dir, encoding: 'utf8', maxBuffer: 64 << 20, shell: process.platform === 'win32' });
  if (r.stderr) process.stderr.write(r.stderr);
  return { code: r.status ?? 2, stdout: r.stdout ?? '' };
}
