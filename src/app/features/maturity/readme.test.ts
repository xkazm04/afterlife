// The README names every hook, flow logic file, keymap and loader in the folders it describes.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const here = (p: string) => new URL(`./${p}`, import.meta.url);
const readme = readFileSync(here('README.md'), 'utf8');
const files = (dir: string) => readdirSync(here(dir)).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'));

describe('README', () => {
  it.each([
    ['hooks', 'hooks'],
    ['model/flow', 'model/flow'],
    ['data loaders', 'data'],
    ['keymap', 'model/keys'],
  ])('names every file in %s', (_n, dir) => {
    const missing = files(dir)
      .map((f) => f.replace(/\.tsx?$/, ''))
      .filter((base) => dir !== 'data' || base.startsWith('load'))
      .filter((base) => !readme.includes(base));
    expect(missing).toEqual([]);
  });
});
