// One reading of a repeated search param: firstParam, and no route or loader re-declares `Array.isArray(v) ? v[0] : v`.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { firstParam } from './searchParams';

describe('firstParam', () => {
  it.each([
    ['once', 'off', 'off'],
    ['repeated', ['off', 'on'], 'off'],
    ['absent', undefined, undefined],
    ['empty', '', ''],
  ] as const)('%s', (_name, v, want) => {
    expect(firstParam(v as string | string[] | undefined)).toBe(want);
  });
});

const APP = path.join(import.meta.dirname, '../../app');
const COPY = /Array\.isArray\(([\w.]+)\)\s*\?\s*\1\[0\]\s*:\s*\1\b/;

/** The .ts/.tsx sources under src/app, tests excluded, with comments stripped. */
function sources(dir: string): [string, string][] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e): [string, string][] => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) return [];
    return [[path.relative(APP, p), fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')]];
  });
}

describe('one implementation', () => {
  it('no source under src/app hand-writes the first-value read', () => {
    expect(sources(APP).filter(([, s]) => COPY.test(s)).map(([f]) => f)).toEqual([]);
  }, 120_000); // walks the whole src/app tree: seconds alone, past the 30 s default under a loaded full suite
  it('the matcher sees a copy (seeded control)', () => {
    expect(COPY.test('const raw = Array.isArray(params.mr) ? params.mr[0] : params.mr;')).toBe(true);
    expect(COPY.test('const one = (v) => (Array.isArray(v) ? v[0] : v);')).toBe(true);
  });
});
