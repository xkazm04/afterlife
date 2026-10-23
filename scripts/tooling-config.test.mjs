// The repo-level tooling configs (eslint.config.mjs, vitest.config.ts) hold hand-written path lists; each case checks a
// list against what the tree actually holds, so a list that drifts goes red here instead of silently skipping work.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('eslint.config.mjs', () => {
  // belay run (runner/git/worktree.ts:14) and agent worktree isolation both check out whole copies of the repo under
  // .claude/worktrees/<name>; `npm run lint` (eslint, no args) would lint every copy and report a lane's in-flight edits.
  it('ignores the worktree copies under .claude/, and still lints the app', async () => {
    const eslint = new ESLint({ cwd: root });
    expect(await eslint.isPathIgnored(path.join(root, '.claude/worktrees/lane-1/src/app/page.tsx'))).toBe(true);
    expect(await eslint.isPathIgnored(path.join(root, 'src/app/error.tsx'))).toBe(false);
    expect(await eslint.isPathIgnored(path.join(root, 'scripts/build-demo.mjs'))).toBe(false);
  }, 60_000);
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
  });
});
