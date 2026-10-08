// The server never imports the screens: a rule both sides use (the promotion rule) lives in src/lib. Tests are exempt:
// the parity tests drive the screens' own loaders against the live source on purpose.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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

describe('layers', () => {
  it('no source file under src/server imports from src/app', () => {
    const files = sources(SERVER);
    expect(files.length).toBeGreaterThan(50);
    const bad = files.flatMap((f) => imports(f).filter((i) => i === APP || i.startsWith(APP + path.sep)).map(() => path.relative(SERVER, f)));
    expect(bad).toEqual([]);
  });
});
