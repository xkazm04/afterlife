// STUB - WP2 fills this: the throttled, low-priority vitest runner. `node scripts/test/run.mjs [vitest args]` forwards its
// arguments to `vitest run` and exits with its code. Until WP2 lands it only forwards.
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['vitest', 'run', ...process.argv.slice(2)], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
