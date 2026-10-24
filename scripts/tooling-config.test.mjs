// The repo-level tooling configs (eslint.config.mjs, vitest.config.ts) hold hand-written path lists; each case checks a
// list against what the tree actually holds, so a list that drifts goes red here instead of silently skipping work.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it, vi } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The case checks this repo's own ignores block, not Next's rules: loading eslint-config-next (typescript-eslint and
// typescript) took 2.1 s of the case's 2.6 s alone and pushed it past 60 s under a loaded full suite. Each stands in as
// one config that lints every source extension, so a too-wide ignore still reads as an app file going unlinted.
const linted = vi.hoisted(() => ({ default: [{ files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'] }] }));
vi.mock('eslint-config-next/core-web-vitals', () => linted);
vi.mock('eslint-config-next/typescript', () => linted);

describe('eslint.config.mjs', () => {
  // belay run (runner/git/worktree.ts:14) and agent worktree isolation both check out whole copies of the repo under
  // .claude/worktrees/<name>; `npm run lint` (eslint, no args) would lint every copy and report a lane's in-flight edits.
  it('ignores the worktree copies under .claude/, and still lints the app', async () => {
    const { default: config } = await import('../eslint.config.mjs');
    const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });
    expect(await eslint.isPathIgnored(path.join(root, '.claude/worktrees/lane-1/src/app/page.tsx'))).toBe(true);
    expect(await eslint.isPathIgnored(path.join(root, 'src/app/error.tsx'))).toBe(false);
    expect(await eslint.isPathIgnored(path.join(root, 'scripts/build-demo.mjs'))).toBe(false);
  });
});

describe('vitest.config.ts', () => {
  // `include` is a hand-written list of globs; a test file outside it is never run and never reported. The ground truth
  // is every tracked file named *.test.* / *.spec.*, not the list itself.
  it('includes every tracked test file', async () => {
    const { default: config } = await import('../vitest.config.ts');
    const include = config.test.include;
    const tracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.split('\n');
    const tests = tracked.filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f));
    expect(tests.length).toBeGreaterThan(100);
    const skipped = tests.filter((f) => !include.some((g) => path.posix.matchesGlob(f, g)));
    expect(skipped).toEqual([]);
  }, 120_000); // walks the whole tracked tree: seconds alone, past the 30 s default under a loaded full suite

  // The projects (`unit` / `db` / `spawn`) are what actually run: a file in none is never run, a file in two runs twice.
  it('puts every tracked test file in exactly one project', async () => {
    const { default: config } = await import('../vitest.config.ts');
    const projects = config.test.projects;
    expect(projects.map((p) => p.test.name)).toEqual(['unit', 'db', 'spawn']);
    const tracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.split('\n');
    const tests = tracked.filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f));
    expect(tests.length).toBeGreaterThan(100);
    // Each project lists its files by path; a glob still counts, so a hand-added one cannot slip past.
    const matchers = projects.map((p) => {
      const exact = new Set(p.test.include.filter((g) => !/[*?[{]/.test(g)));
      const globs = p.test.include.filter((g) => !exact.has(g));
      return { name: p.test.name, has: (f) => exact.has(f) || globs.some((g) => path.posix.matchesGlob(f, g)) };
    });
    const homes = (f) => matchers.filter((m) => m.has(f)).map((m) => m.name);
    expect(tests.filter((f) => homes(f).length !== 1).map((f) => `${f}: ${homes(f).join(', ') || 'none'}`)).toEqual([]);
    for (const p of projects) expect(p.test.include.length, p.test.name).toBeGreaterThan(0);
  }, 120_000);
});
