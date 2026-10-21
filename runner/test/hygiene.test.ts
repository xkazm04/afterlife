// The diff check against real git: only whitespace the lane added counts, never what base already had.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { diffSlips } from '../lane/hygiene';

let repo: string;
let base: string;
const sh = (...a: string[]) => spawnSync('git', a, { cwd: repo, encoding: 'utf8' }).stdout.trim();
const write = (f: string, text: string) => fs.writeFileSync(path.join(repo, f), text);

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-hyg-'));
  sh('init', '-q', '-b', 'main');
  sh('config', 'core.autocrlf', 'false');
  // Base already holds one double blank line: a lane keeping it is not a slip.
  write('a.ts', 'import { x } from "./x";\n\n\nexport const a = x;\n');
  write('crlf.ts', 'export const c = 1;\r\nexport const d = 2;\r\n');
  sh('add', '-A');
  sh('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'base');
  base = sh('rev-parse', 'HEAD');
});
afterEach(() => fs.rmSync(repo, { recursive: true, force: true }));

describe('diffSlips', () => {
  it('passes a clean change, an unchanged double blank line and CRLF line ends', async () => {
    write('a.ts', 'import { x } from "./x";\n\n\nexport const a = x + 1;\n');
    write('crlf.ts', 'export const c = 1;\r\nexport const d = 3;\r\n');
    sh('add', '-A');
    expect(await diffSlips(repo, base)).toEqual([]);
  });

  it('names a new run of two blank lines and trailing whitespace the lane added', async () => {
    write('b.ts', 'export const b = 1;\n\n\nexport const e = 2;   \n');
    sh('add', '-A');
    const slips = await diffSlips(repo, base);
    expect(slips.some((s) => /^b\.ts:\d+: trailing whitespace/.test(s))).toBe(true);
    expect(slips).toContain('b.ts: 1 new run(s) of two blank lines');
  });

  it('passes a new Python file with PEP 8 spacing, but still names its trailing whitespace', async () => {
    write('test_x.py', 'import os\n\n\ndef test_a() -> None:\n    assert os\n\n\ndef test_b() -> None:  \n    assert os\n');
    sh('add', '-A');
    const slips = await diffSlips(repo, base);
    expect(slips.some((s) => /^test_x\.py:8: trailing whitespace/.test(s))).toBe(true);
    expect(slips.some((s) => /two blank lines/.test(s))).toBe(false);
  });
});
