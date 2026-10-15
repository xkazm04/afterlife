// The server never imports the screens: a rule both sides use (the promotion rule) lives in src/lib. Tests are exempt:
// the parity tests drive the screens' own loaders against the live source on purpose.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BELAY_PROJECTS } from '../setup/read';

const SERVER = path.resolve('src/server');
const APP = path.resolve('src/app');

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** Where each import of a file points, resolved: `@/` is src/. */
const imports = (file: string): string[] =>
  [...fs.readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map(([, spec = '']) =>
    spec.startsWith('@/') ? path.resolve('src', spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(file), spec) : spec);

describe('the READMEs', () => {
  const read = (p: string): string => fs.readFileSync(path.join(SERVER, p), 'utf8');
  const names = (dir: string, keep: (n: string) => boolean): string[] => fs.readdirSync(path.join(SERVER, dir)).filter((n) => /\.ts$/.test(n) && keep(n));
  const source = (n: string): boolean => !/\.test\.ts$/.test(n);

  // The folder is the ground truth, not a list in this test: a file added to it that its README does not name fails here.
  it('data/README.md names every source file of data/, data/live/ and data/setup/', () => {
    const readme = read('data/README.md');
    const files = ['data', 'data/live', 'data/setup'].flatMap((d) => names(d, source));
    expect(files.length).toBeGreaterThan(20);
    expect(files.filter((f) => !readme.includes(f))).toEqual([]);
  });

  it('data/README.md names every belay project the Setup reads', () => {
    const readme = read('data/README.md');
    expect(BELAY_PROJECTS.filter((p) => !readme.includes(p))).toEqual([]);
  });

  it('ledger/README.md names every source file and every test of ledger/', () => {
    const readme = read('ledger/README.md');
    const files = [...names('ledger', source), ...names('ledger/__tests__', () => true)];
    expect(files.length).toBeGreaterThan(6);
    expect(files.filter((f) => !readme.includes(f))).toEqual([]);
  });
});

describe('layers', () => {
  it('no source file under src/server imports from src/app', () => {
    const files = sources(SERVER);
    expect(files.length).toBeGreaterThan(50);
    const bad = files.flatMap((f) => imports(f).filter((i) => i === APP || i.startsWith(APP + path.sep)).map(() => path.relative(SERVER, f)));
    expect(bad).toEqual([]);
  });
});
