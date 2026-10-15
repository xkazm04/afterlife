import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The README's "Tests:" line is a hand-kept list. Derive the ground truth from the tree, not from the list itself.
const root = path.resolve(import.meta.dirname, '..');
const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
const tests = (readdirSync(root, { recursive: true, encoding: 'utf8' }) as string[]).map((f) => f.split(path.sep).join('/')).filter((f) => /\.test\.tsx?$/.test(f));

describe('the Theater README names its tests', () => {
  it('finds the test files it is meant to list', () => {
    expect(tests.length).toBeGreaterThan(10);
  });
  it('lists every test file under the feature', () => {
    expect(tests.filter((f) => !readme.includes(`\`${f}\``))).toEqual([]);
  });
});
