// One rule, one implementation: the components ask the model instead of re-spelling its rules.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const here = import.meta.dirname;
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith('.tsx') && !n.includes('.test.') ? [join(dir, n)] : []));
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:])\/\/.*$/gm, '$1');
const sources = walk(here).map((f) => ({ f: f.slice(here.length + 1).replace(/\\/g, '/'), code: strip(readFileSync(f, 'utf8')) }));
const hits = (re: RegExp): string[] => sources.filter((s) => re.test(s.code)).map((s) => s.f);

describe('components do not re-spell the model\'s rules', () => {
  it('"deep" is isDeep() from model/rungs, not a literal >= 3', () => {
    expect(hits(/>=\s*3\b/)).toEqual([]);
  });
  it('a stage page link is stagePath(), not a second /maturity/ template', () => {
    expect(hits(/[`'"]\/maturity\//)).toEqual([]);
  });
});
