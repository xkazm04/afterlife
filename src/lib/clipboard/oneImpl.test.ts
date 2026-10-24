// One implementation of Copy Command: the clipboard-with-fallback lives in copyCommand.ts, and no screen declares its own.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });

describe('Copy Command is implemented once', () => {
  it('only src/lib/clipboard/copyCommand.ts declares copyCommand', () => {
    const decl = /(?:function|const)\s+copyCommand\b/;
    const owners = walk(path.join(root, 'src')).filter((p) => decl.test(fs.readFileSync(p, 'utf8'))).map((p) => path.relative(root, p).split(path.sep).join('/'));
    expect(owners).toEqual(['src/lib/clipboard/copyCommand.ts']);
  }, 120_000); // walks the whole src/ tree: seconds alone, past the 30 s default under a loaded full suite
});
