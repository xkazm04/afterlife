// The three Vitest projects (`unit`, `db`, `spawn`), derived from each test file's own text when the config loads: never a
// hand-written path list. `db` boots an embedded Postgres (about 1 GB a worker), `spawn` starts child processes, the rest is `unit`.
import fs from 'node:fs';
import path from 'node:path';

export const TIERS = ['unit', 'db', 'spawn'];
/** A test that names any of these boots an embedded database. The one list: add a marker here, nowhere else. */
export const DB_MARKERS = ['memoryIndex', '@electric-sql/pglite', 'seedDemo', 'openIndex', 'PGlite'];
export const SPAWN_MARKERS = ['child_process', 'spawnSync', 'execFile', 'spawn(', 'execSync'];
/** The cap on workers, per project and at the root, unless the command line says otherwise (4 of 12 cores here). */
export const WORKER_CAP = '33%';
/** `run.mjs` puts a file list too long for a command line here (a path to a file of paths, one per line). */
export const LIST_ENV = 'AFTERLIFE_TEST_LIST';

/** `db` wins over `spawn`; anything else is `unit`. */
export function tierOf(src) {
  if (DB_MARKERS.some((m) => src.includes(m))) return 'db';
  if (SPAWN_MARKERS.some((m) => src.includes(m))) return 'spawn';
  return 'unit';
}

/** `--maxWorkers=N` / `--maxWorkers N` from the command line (projects ignore the CLI flag otherwise), else the cap. */
export function workerCap(argv = process.argv, cap = WORKER_CAP) {
  for (let i = 0; i < argv.length; i++) {
    const m = /^--maxWorkers(?:=(.+))?$/.exec(argv[i] ?? '');
    if (m) return m[1] ?? argv[i + 1] ?? cap;
  }
  return cap;
}

const norm = (f) => f.split(path.sep).join('/').replace(/^\.\//, '');

/** The file list `run.mjs` handed over through LIST_ENV, or null when there is none. */
export function listedFiles(env = process.env) {
  const at = env[LIST_ENV];
  if (!at) return null;
  return new Set(fs.readFileSync(at, 'utf8').split(/\r?\n/).map((l) => norm(l.trim())).filter(Boolean));
}

// A test helper (a non-test module under __tests__/ or testing/) counts as part of the test that imports it: rig.ts boots
// the index through memoryIndex, so a test that only imports the rig is still a db test. Production modules are not followed.
const HELPER = /(?:^|\/)(?:__tests__|testing)\/.*\.[cm]?[jt]sx?$/;
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const LOCAL_SPEC = /['"]((?:\.{1,2}|@)\/[^'"\n]+)['"]/g;
const EXTS = ['', '.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.tsx'];

/** The helper modules a file names (relative or `@/` specifiers), as root-relative paths that exist. */
function helpersOf(root, file, src) {
  const out = [];
  for (const [, spec] of src.matchAll(LOCAL_SPEC)) {
    const base = spec.startsWith('@/') ? path.posix.join('src', spec.slice(2)) : path.posix.join(path.posix.dirname(file), spec);
    const hit = EXTS.map((e) => base + e).find((f) => HELPER.test(f) && !TEST_FILE.test(f) && fs.existsSync(path.join(root, f)) && fs.statSync(path.join(root, f)).isFile());
    if (hit) out.push(hit);
  }
  return out;
}

/** The text of a test file plus every helper it reaches through other helpers (each read once per config load). */
function reachText(root, file, cache) {
  const seen = new Set([file]);
  const queue = [file];
  let text = '';
  while (queue.length) {
    const f = /** @type {string} */ (queue.shift());
    if (!cache.has(f)) cache.set(f, fs.readFileSync(path.join(root, f), 'utf8'));
    const src = cache.get(f);
    text += '\n' + src;
    for (const h of helpersOf(root, f, src)) if (!seen.has(h)) { seen.add(h); queue.push(h); }
  }
  return text;
}

/**
 * Every file the include globs match, by tier (forward-slash paths relative to root, sorted).
 * @param {string} root
 * @param {string[]} include
 * @param {Set<string> | null} [only] keep just these files (a long list from `run.mjs`)
 * @returns {Record<string, string[]>}
 */
export function splitTiers(root, include, only = null) {
  const files = fs.globSync(include, { cwd: root }).map(norm).filter((f) => !/(?:^|\/)node_modules\//.test(f));
  const out = Object.fromEntries(TIERS.map((t) => [t, []]));
  const cache = new Map();
  for (const f of [...new Set(files)].sort()) {
    if (only && !only.has(f)) continue;
    out[tierOf(reachText(root, f, cache))].push(f);
  }
  return out;
}
