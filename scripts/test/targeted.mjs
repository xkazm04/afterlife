// `npm test`: only the tests that matter for what changed, plus the derived guard tests, through the throttled runner.
//   node scripts/test/targeted.mjs [--guards-only] [--plan] [--since <rev | a..b>] [-- <vitest args>]
// --plan prints the plan and runs nothing. --since replaces the merge-base with main (a..b replays a committed range alone).
// It never selects the whole suite: an infra change runs the guards and the `unit` project (when there is one) and says so.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findGuards, listTests, testGlobs } from './guards.mjs';
import { BROAD_PERCENT, SOURCE_ROOTS, planFor, relatedSources } from './plan.mjs';
import { splitTiers } from './tiers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });

const argv = process.argv.slice(2);
const dd = argv.indexOf('--');
const mine = dd === -1 ? argv : argv.slice(0, dd);
const forwarded = dd === -1 ? [] : argv.slice(dd + 1);
const guardsOnly = mine.includes('--guards-only');
const planOnly = mine.includes('--plan');
const sinceAt = mine.indexOf('--since');
const since = sinceAt === -1 ? null : mine[sinceAt + 1];

/** `git diff --name-status` -z output as the paths it touches (a rename gives both its old and new path). */
function diffPaths(range) {
  const parts = git(['diff', '--name-status', '-z', '-M', range, '--']).split('\0');
  const out = [];
  for (let i = 0; i < parts.length - 1; ) {
    const status = parts[i++];
    const n = /^[RC]/.test(status) ? 2 : 1;
    out.push(...parts.slice(i, i + n));
    i += n;
  }
  return out;
}

/** Working tree + untracked + commits since the merge-base with main; or just the range given to --since. */
function changedSet() {
  if (since?.includes('..')) return diffPaths(since);
  let base = since;
  if (!base) {
    try { base = git(['merge-base', 'HEAD', 'main']).trim(); } catch { base = 'HEAD'; }
  }
  const untracked = git(['ls-files', '-z', '--others', '--exclude-standard']).split('\0').filter(Boolean);
  return [...new Set([...diffPaths(base), ...untracked])];
}

/** A deleted file is no longer in the import graph, so the files that still name it stand in for it (one level). */
function importersOfDeleted(sources) {
  const gone = sources.filter((f) => !fs.existsSync(path.join(root, f)));
  return gone.flatMap((f) => {
    const base = path.posix.basename(f).replace(/\.[^.]+$/, '');
    const name = base === 'index' ? path.posix.basename(path.posix.dirname(f)) : base;
    if (!/^[\w-]+$/.test(name)) return [];
    try {
      const found = git(['grep', '-lzE', `from ['"][^'"]*/${name}(\\.[a-z]+)?['"]`, '--', ...SOURCE_ROOTS.map((r) => `${r}*`)]);
      return found.split('\0').filter((x) => x && x !== f);
    } catch { return []; } // git grep exits 1 when nothing matches
  });
}

/** Test files linked to the changed sources by vitest's own import graph (a child process: it lists, it runs nothing). */
function relatedTests(listed) {
  const sources = [...new Set([...listed, ...importersOfDeleted(listed)])];
  if (!sources.length) return [];
  const r = spawnSync(process.execPath, [path.join(here, 'related.mjs'), ...sources], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) {
    console.warn(`warning: the import-graph lookup failed (exit ${r.status}); running changed tests and guards only\n${r.stderr}`);
    return [];
  }
  return JSON.parse(r.stdout || '[]');
}

/** One throttled vitest run on these file filters (run.mjs takes a list of any length: one process, one startup). */
function run(filters, extra) {
  return spawnSync(process.execPath, [path.join(here, 'run.mjs'), ...filters, '--passWithNoTests', ...extra], { cwd: root, stdio: 'inherit' }).status ?? 1;
}

/** A test file's project, the same derivation vitest.config.ts uses; read only when a change is broad. */
let tiers = null;
function tierOf(file) {
  if (!tiers) {
    const byTier = splitTiers(root, testGlobs(fs.readFileSync(path.join(root, 'vitest.config.ts'), 'utf8')));
    tiers = new Map(Object.entries(byTier).flatMap(([t, files]) => files.map((f) => [f, t])));
  }
  return tiers.get(file) ?? 'unit';
}

const allTests = listTests(root);
const guards = findGuards(root, allTests);
const changed = guardsOnly ? [] : changedSet();
const plan = planFor({ changed, allTests, guards, related: guardsOnly ? [] : relatedTests(relatedSources(changed)) }, tierOf);
const reason = guardsOnly ? 'guards only' : plan.reason;
console.log(`plan: ${plan.files.length} test files (${plan.guards.length} guards) because ${reason}`);
if (plan.skipped.length) {
  console.log(`broad change (related tests over ${BROAD_PERCENT}% of all): only the unit tier of them runs, with the guards and the changed tests`);
  console.log(`broad change: ${plan.skipped.length} related tests in db/spawn not run - the full suite is the owner's call (npm run test:all)`);
}

if (planOnly) {
  for (const f of plan.files) console.log(`  ${plan.guards.includes(f) ? 'guard  ' : 'related'} ${f}`);
  process.exit(0);
}
if (!plan.files.length) {
  console.error('no guard tests found: refusing to run with an empty filter (that would select every test)');
  process.exit(1);
}

let code = run(guardsOnly ? plan.guards : plan.files, forwarded);
if (plan.infra && !guardsOnly) {
  console.log('infra changed: the full suite is the owner\'s call (npm run test:all)');
  // the config names its projects from TIERS (scripts/test/tiers.mjs), so `name: 'unit'` is no longer written out
  if (/name:\s*['"]unit['"]|\bTIERS\b/.test(fs.readFileSync(path.join(root, 'vitest.config.ts'), 'utf8'))) {
    code = Math.max(code, spawnSync(process.execPath, [path.join(here, 'run.mjs'), '--project', 'unit', '--passWithNoTests', ...forwarded], { cwd: root, stdio: 'inherit' }).status ?? 1);
  }
}
process.exit(code);
