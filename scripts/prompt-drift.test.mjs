// prompt-drift: exit 0 when every vendored source still hashes as pinned, 1 when one was edited, 2 when the
// ascent checkout is missing. Runs against a scratch fake ascent dir and manifest, never the real ../ascent.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'prompt-drift.mjs');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');

let tmp;
let ascent;
let sources;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-drift-'));
  ascent = path.join(tmp, 'ascent');
  fs.mkdirSync(path.join(ascent, 'src'), { recursive: true });
  fs.writeFileSync(path.join(ascent, 'src/a.ts'), 'export const a = 1;\n');
  sources = path.join(tmp, 'sources.json');
  fs.writeFileSync(
    sources,
    JSON.stringify({ ascent: 'a'.repeat(40), sources: [{ file: 'plan.md', from: [{ path: 'src/a.ts', sha256: hash('export const a = 1;\n') }] }] }),
  );
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const run = (dir) => spawnSync(process.execPath, [script, '--ascent', dir, '--sources', sources], { encoding: 'utf8' });

describe('scripts/prompt-drift.mjs', () => {
  it('exits 0 when sources match', () => {
    expect(run(ascent).status).toBe(0);
  });
  it('treats CRLF checkouts as unchanged', () => {
    fs.writeFileSync(path.join(ascent, 'src/a.ts'), 'export const a = 1;\r\n');
    expect(run(ascent).status).toBe(0);
  });
  it('exits 1 and names the source when one is edited', () => {
    fs.writeFileSync(path.join(ascent, 'src/a.ts'), 'export const a = 2;\n');
    const r = run(ascent);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('src/a.ts');
    expect(r.stdout).toContain('plan.md');
  });
  it('exits 2 with a hint when the checkout is missing', () => {
    const r = run(path.join(tmp, 'nope'));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--ascent');
  });
});
