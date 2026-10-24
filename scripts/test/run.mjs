// The throttled vitest runner: `node scripts/test/run.mjs [vitest args]` runs `vitest run <args>` at below-normal priority
// (the workers inherit it), with no shell in between, and exits with vitest's code.
// A file list too long for one command line (Windows caps it at 32,767 characters) goes through a temp file instead: the
// test files among the arguments are written to os.tmpdir() and vitest.config.ts narrows every project to them (LIST_ENV).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIST_ENV } from './tiers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARG_LIMIT = 30_000;
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

try {
  os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
} catch (e) {
  console.warn(`warning: could not lower the test run's priority (${e instanceof Error ? e.message : e}); running at normal priority`);
}

let args = process.argv.slice(2);
const env = { ...process.env };
let listFile = null;
if (args.reduce((n, a) => n + a.length + 1, 0) > ARG_LIMIT) {
  const files = args.filter((a) => !a.startsWith('-') && TEST_FILE.test(a) && fs.existsSync(path.resolve(root, a)));
  listFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-tests-')), 'files.txt');
  fs.writeFileSync(listFile, files.join('\n'));
  const moved = new Set(files);
  args = args.filter((a) => !moved.has(a));
  env[LIST_ENV] = listFile;
  console.log(`run: ${files.length} test files passed through ${listFile} (too long for one command line)`);
}

const r = spawnSync(process.execPath, [path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...args], { cwd: root, stdio: 'inherit', env });
if (listFile) fs.rmSync(path.dirname(listFile), { recursive: true, force: true, maxRetries: 3 });
if (r.error) console.error(`could not start vitest: ${r.error.message}`);
process.exit(r.status ?? 1);
