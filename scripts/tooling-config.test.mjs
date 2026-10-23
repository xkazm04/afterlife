// The repo-level tooling configs (eslint.config.mjs, vitest.config.ts) hold hand-written path lists; each case checks a
// list against what the tree actually holds, so a list that drifts goes red here instead of silently skipping work.
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
