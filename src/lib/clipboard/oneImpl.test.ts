// One implementation of Copy Command: the clipboard-with-fallback lives in copyCommand.ts, and no screen declares its own
// or writes the clipboard itself (a bare navigator.clipboard.writeText is a TypeError on an insecure origin).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');
const HOME = 'src/lib/clipboard/copyCommand.ts';
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
/** Every non-test source under src, as [repo-relative path, text with comments stripped]. */
const sources = (): [string, string][] =>
  walk(path.join(root, 'src')).map((p) => [
    path.relative(root, p).split(path.sep).join('/'),
    fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'),
  ]);
/** A clipboard write: `navigator.clipboard.writeText(`, `clip.writeText(`, `clip?.writeText(`. */
const WRITE = /\.\s*writeText\s*\(/;

describe('Copy Command is implemented once', () => {
  it('only src/lib/clipboard/copyCommand.ts declares copyCommand', () => {
    const decl = /(?:function|const)\s+copyCommand\b/;
    expect(sources().filter(([, s]) => decl.test(s)).map(([f]) => f)).toEqual([HOME]);
  }, 120_000); // walks the whole src/ tree: seconds alone, past the 30 s default under a loaded full suite

  it('only copyCommand.ts calls clipboard writeText', () => {
    expect(sources().filter(([f, s]) => f !== HOME && WRITE.test(s)).map(([f]) => f)).toEqual([]);
  }, 120_000); // walks the whole src/ tree, as above

  it('the matcher sees a write (seeded control)', () => {
    expect(WRITE.test('navigator.clipboard.writeText(path).then(done, fail);')).toBe(true);
    expect(WRITE.test('await clip.writeText(text);')).toBe(true);
    expect(WRITE.test("clip?.writeText('x')")).toBe(true);
    expect(WRITE.test("writeText: () => {}")).toBe(false);
  });
});
