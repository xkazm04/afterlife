// check-structure.mjs is the owner's size rule made executable; a gate nobody has seen go red proves nothing.
// Each case builds a scratch tree, runs the real script on it and reads the exit code.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'check-structure.mjs');
const made = [];

function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-structure-'));
  made.push(dir);
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}
const lines = (n) => Array.from({ length: n }, (_, i) => `// ${i}`).join('\n');
const run = (dir) => spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });

afterEach(() => {
  for (const d of made.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('scripts/check-structure.mjs', () => {
  it('passes a small, shallow tree', () => {
    const r = run(tree({ 'a.ts': lines(10), 'sub/b.tsx': lines(10) }));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('structure: ok');
  });

  it('fails a source file over 200 lines and names it', () => {
    const r = run(tree({ 'big.ts': lines(201) }));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('big.ts has 201 lines');
  });

  it('fails a folder holding more than 10 files, but not sub-folders', () => {
    const eleven = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`f${i}.ts`, 'x']));
    const r = run(tree(eleven));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('has 11 files');
    const nested = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`d${i}/f.ts`, 'x']));
    expect(run(tree(nested)).status).toBe(0);
  });

  it('ignores files that are not source (a long .json passes)', () => {
    expect(run(tree({ 'data.json': lines(500) })).status).toBe(0);
  });

  it('refuses a root that is not a directory with one line and exit 2, not a stack trace', () => {
    const r = run(path.join(os.tmpdir(), 'belay-structure-missing-root'));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('is not a directory');
    expect(r.stderr).not.toContain('node:fs');
  });
});
