import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findGuards, globToRegex, isGuard, listTests, testGlobs } from './guards.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Fixtures spell the calls in pieces so this file's own text is not a tree-walking test itself.
const walk = 'readdir' + 'Sync';
const cwd = 'process' + '.cwd()';
const lsFiles = 'git ls-' + 'files';

describe('isGuard', () => {
  it('flags a test that lists, globs, or reads under the tree', () => {
    expect(isGuard(`fs.${walk}(dir)`)).toBe(true);
    expect(isGuard(`const here = ${cwd};`)).toBe(true);
    expect(isGuard(`execSync('${lsFiles}')`)).toBe(true);
    expect(isGuard(`readFile${'Sync'}(join(root, 'src/x.ts'), 'utf8')`)).toBe(true);
  });
  it('passes a plain unit test, and a call that only sits in a comment', () => {
    expect(isGuard(`import { place } from './place';\nexpect(place(1)).toBe(2);`)).toBe(false);
    expect(isGuard(`// fs.${walk}(dir)\n/* ${cwd} */\nexpect(1).toBe(1);`)).toBe(false);
  });
});

describe('include globs', () => {
  it('are read from the vitest config text', () => {
    expect(testGlobs("include: ['src/**/*.test.ts', 'cli/**/*.test.mjs'], environment: 'node'")).toEqual(['src/**/*.test.ts', 'cli/**/*.test.mjs']);
  });
  it('turn into path matchers', () => {
    const re = globToRegex('src/**/*.test.ts');
    expect(re.test('src/a/b/c.test.ts')).toBe(true);
    expect(re.test('src/c.test.ts')).toBe(true);
    expect(re.test('src/c.test.tsx')).toBe(false);
    expect(re.test('docs/c.test.ts')).toBe(false);
  });
});

describe('the derived guard set of this repo', () => {
  const tests = listTests(root);
  const guards = findGuards(root, tests);
  it('holds the known tree-walkers', () => {
    for (const f of [
      'src/components/shell/sidebar/navItems.test.ts',
      'src/app/features/settings/data/screenKeys.test.ts',
      'src/app/features/kit/kitCoverage.test.ts',
      'src/components/readme.test.ts',
    ]) expect(guards, f).toContain(f);
  });
  it('holds no plain unit test of a pure model', () => {
    for (const f of ['src/app/features/xray/model/place.test.ts', 'src/app/features/fleet/model/columns.test.ts', 'src/app/features/maturity/model/rungs.test.ts']) {
      expect(tests, f).toContain(f);
      expect(guards, f).not.toContain(f);
    }
  });
  it('is a small subset of the suite', () => {
    expect(tests.length).toBeGreaterThan(300);
    expect(guards.length).toBeGreaterThan(20);
    expect(guards.length).toBeLessThan(tests.length / 4);
  });
});
