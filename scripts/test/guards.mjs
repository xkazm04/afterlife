// Guard tests: the tests that read the source tree itself (walk it, grep it, list it), so a change anywhere can break them
// without any import linking the two. They are DERIVED from the test files' own text, never listed by hand, and never cached.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Block and line comments out, so a call quoted in a comment is neither a guard nor an excuse. */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
}

// A directory listing, a glob, the cwd, `git ls-files`, or a read of a path under src/ or docs/.
const TREE_WALK = /\breaddirSync\b|\bglobSync\b|process\.cwd\(\)|ls-files|readFileSync\([^)]*\b(?:src|docs)\b/;

/** True when the test source walks or greps the tree. */
export function isGuard(src) {
  return TREE_WALK.test(stripComments(src));
}

/** The test include globs, read from the vitest config text (every `'...*.test.*'` string, so a `projects` split works too). */
export function testGlobs(configText) {
  return [...configText.matchAll(/'([^'\n]*\*[^'\n]*\.test\.[^'\n]*)'/g)].map((m) => m[1]);
}

/** A vitest include glob (`src/**\/*.test.ts`) as a regular expression over a forward-slash relative path. */
export function globToRegex(glob) {
  const body = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?');
  return new RegExp(`^${body}$`);
}

/** Every test file vitest would collect: tracked and untracked files (minus ignored) matching the config's include globs. */
export function listTests(root) {
  const globs = testGlobs(fs.readFileSync(path.join(root, 'vitest.config.ts'), 'utf8')).map(globToRegex);
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  return out
    .split('\0')
    .filter((f) => f && globs.some((g) => g.test(f)) && fs.existsSync(path.join(root, f)))
    .sort();
}

/** The guard subset of `tests` (relative paths), by reading each file. */
export function findGuards(root, tests) {
  return tests.filter((f) => isGuard(fs.readFileSync(path.join(root, f), 'utf8')));
}
