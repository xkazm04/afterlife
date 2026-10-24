// One spelling of a project's Fleet route: fleetHref, and no source under src re-types `/fleet/${encodeURIComponent(...)}`.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fleetHref } from './fleetHref';

describe('fleetHref', () => {
  it('encodes the id into the project route', () => {
    expect(fleetHref('acme')).toBe('/fleet/acme');
    expect(fleetHref('a b/c')).toBe('/fleet/a%20b%2Fc');
  });
});

const SRC = path.join(import.meta.dirname, '../..');
const HOME = path.join('lib', 'url', 'fleetHref.ts');
const COPY = /\/fleet\/\$\{\s*encodeURIComponent\(/;

/** The .ts/.tsx sources under src, tests excluded, with comments stripped. */
function sources(dir: string): [string, string][] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e): [string, string][] => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) return [];
    return [[path.relative(SRC, p), fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')]];
  });
}

describe('one implementation', () => {
  it('no source under src but fleetHref spells the project route', () => {
    expect(sources(SRC).filter(([f, s]) => f !== HOME && COPY.test(s)).map(([f]) => f)).toEqual([]);
  });
  it('the matcher sees a copy (seeded control)', () => {
    expect(COPY.test('router.push(`/fleet/${encodeURIComponent(id)}`);')).toBe(true);
    expect(COPY.test('redirect(`/fleet/${ encodeURIComponent(want)}`)')).toBe(true);
  });
});
