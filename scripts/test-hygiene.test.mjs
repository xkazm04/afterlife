// Rules every test file in the repo keeps, checked against the files themselves rather than a hand-written list.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Block and line comments out, so a rule quoted in a comment is neither a breach nor an excuse. */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
}

/** The argument text of each `rmSync(...)` call that removes recursively but never retries. */
export function bareRecursiveRms(src) {
  const code = stripComments(src);
  const found = [];
  for (let at = code.indexOf('rmSync('); at !== -1; at = code.indexOf('rmSync(', at + 1)) {
    let depth = 0;
    let end = at + 'rmSync'.length;
    for (; end < code.length; end++) {
      if (code[end] === '(') depth++;
      else if (code[end] === ')' && --depth === 0) break;
    }
    const args = code.slice(at + 'rmSync('.length, end);
    if (/recursive:\s*true/.test(args) && !/maxRetries/.test(args)) found.push(args.replace(/\s+/g, ' '));
  }
  return found;
}

describe('bareRecursiveRms', () => {
  // The fixtures spell the call as `${rm}` so this file's own source holds no bare call for the repo scan below to flag.
  const rm = 'rm' + 'Sync';
  it('flags a recursive remove with no retries, and passes one that retries or sits in a comment', () => {
    expect(bareRecursiveRms(`fs.${rm}(path.join(a, b), { recursive: true, force: true });`)).toHaveLength(1);
    expect(bareRecursiveRms(`${rm}(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })`)).toEqual([]);
    expect(bareRecursiveRms(`// fs.${rm}(d, { recursive: true })\n/* ${rm}(d, { recursive: true }) */`)).toEqual([]);
    expect(bareRecursiveRms(`fs.${rm}(file, { force: true });`)).toEqual([]);
  });
});

describe('test temp cleanups', () => {
  // On Windows a temp tree that a just-exited child (tsx, git, PGlite) still holds throws EPERM/EBUSY under a loaded
  // full suite; rmSync only retries when asked to, so a bare recursive cleanup turns a green test red in its afterAll.
  it('every recursive rmSync in a *.test.* file retries', () => {
    const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
    const tests = listed.stdout.split('\n').filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) && fs.existsSync(path.join(root, f)));
    expect(tests.length).toBeGreaterThan(100);
    const bare = tests.flatMap((f) => bareRecursiveRms(fs.readFileSync(path.join(root, f), 'utf8')).map((a) => `${f}: rmSync(${a})`));
    expect(bare).toEqual([]);
  }, 120_000); // reads every test file in the tree; 0.3 s alone, but a loaded full suite stretches tree walks past 30 s
});
