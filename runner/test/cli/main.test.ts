// `belay run`'s flag parser (runner/main.ts), through tsx as cli/belay.mjs runs it. Every case passes --dry-run and
// points BELAY_CLAUDE_BIN at the fake, so even a parser that let a case through could never spawn a real model.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const tsx = createRequire(import.meta.url).resolve('tsx/cli');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-main-'));
const fleet = path.join(tmp, 'fleet.yml');
fs.writeFileSync(fleet, `repos:\n  - slug: temp\n    path: ${JSON.stringify(tmp)}\n    base: main\n    gates: [node gate.mjs]\n`);
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const run = (...args: string[]) => {
  const env = { ...process.env, BELAY_CLAUDE_BIN: path.join(root, 'runner/test/fakeClaude.mjs') };
  const r = spawnSync(process.execPath, [tsx, '--tsconfig', path.join(root, 'tsconfig.json'), path.join(root, 'runner/main.ts'), '--repo', 'temp', '--fleet', fleet, ...args, '--dry-run'], { cwd: root, env, encoding: 'utf8', timeout: 60_000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

describe('belay run flags', () => {
  it('prints the caps and spawns nothing on a dry run', () => {
    const r = run('--lane-cap', '1');
    expect(r.code).toBe(0);
    expect(r.out).toContain('caps   lane $1, wave $25');
    expect(r.out).toContain('dry run: nothing was spawned.');
  }, 60_000);

  it('refuses a flag it does not know with exit 2, so a misspelt cap never runs at the default', () => {
    const r = run('--lane-caps', '1');
    expect(r.code).toBe(2);
    expect(r.err).toContain('usage: belay run');
    expect(r.out).not.toContain('caps');
  }, 60_000);

  it.each([['--lanes', '2.5'], ['--waves', '1.5']])('refuses a fractional count %s %s, which would run one more than asked', (flag, v) => {
    const r = run(flag, v);
    expect(r.code).toBe(2);
    expect(r.err).toContain('whole numbers');
  }, 60_000);

  it('refuses a model id claude could not be called with, before the base gates spend minutes', () => {
    const r = run('--model', 'sonnet&calc');
    expect(r.code).toBe(2);
    expect(r.err).toContain('--model must be a plain model id');
  }, 60_000);
});
