// The runner's trust boundary: what a lane's children (gates, setup, git hooks, claude) can reach. A lane agent
// may only edit files, but gates and hooks then RUN those files, so whatever the runner hands a child is the
// agent's to read.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIMEOUT_MS, agentEnv, childEnv, killAll, runProc } from '../proc/proc';
import { parseFleet } from '../fleet/load';
import { runGates } from '../lane/verify';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-sec-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

describe('child environment', () => {
  const planted = { GITLAB_TOKEN: 'glpat-x', ANTHROPIC_API_KEY: 'sk-ant-x', CLAUDE_CODE_OAUTH_TOKEN: 'oat-x', AWS_SECRET_ACCESS_KEY: 'aws-x', NPM_TOKEN: 'npm-x', DB_PASSWORD: 'pw' };
  const saved: Record<string, string | undefined> = {};
  const plant = (vars: Record<string, string>) => {
    for (const [k, v] of Object.entries(vars)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
  };
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('gates, setup and git get no secret-shaped variable, the model key included', () => {
    plant(planted);
    const env = childEnv();
    for (const k of Object.keys(planted)) expect(env[k]).toBeUndefined();
    expect(env.PATH ?? env.Path).toBeTruthy();
  });

  it('claude keeps its own credentials and nothing else secret', () => {
    plant(planted);
    const env = agentEnv();
    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-x');
    expect(env.CLAUDE_CODE_OAUTH_TOKEN).toBe('oat-x');
    for (const k of ['GITLAB_TOKEN', 'AWS_SECRET_ACCESS_KEY', 'NPM_TOKEN', 'DB_PASSWORD']) expect(env[k]).toBeUndefined();
  });

  it('BELAY_PASS_ENV lets the operator hand a named variable through', () => {
    plant({ ...planted, BELAY_PASS_ENV: 'NPM_TOKEN' });
    expect(childEnv().NPM_TOKEN).toBe('npm-x');
    expect(childEnv().GITLAB_TOKEN).toBeUndefined();
  });

  it("no child inherits the runner's own tsx and npm state (a fleet repo's npx tsx would load this tsconfig)", () => {
    plant({ TSX_TSCONFIG_PATH: 'C:/afterlife/tsconfig.json', NODE_OPTIONS: '--import tsx', npm_lifecycle_event: 'runner', INIT_CWD: 'C:/afterlife' });
    for (const env of [childEnv(), agentEnv()]) {
      for (const k of ['TSX_TSCONFIG_PATH', 'NODE_OPTIONS', 'npm_lifecycle_event', 'INIT_CWD']) expect(env[k]).toBeUndefined();
    }
  });

  it('a gate the lane agent rewrote cannot read the tokens', async () => {
    plant(planted);
    fs.writeFileSync(path.join(tmp, 'probe.mjs'), "process.exit(process.env.GITLAB_TOKEN || process.env.ANTHROPIC_API_KEY ? 1 : 0);\n");
    expect(await runGates(['node probe.mjs'], tmp, 20_000)).toEqual({ ok: true });
  });
});

describe('child output', () => {
  it('keeps only the tail once a child prints past the cap, so a flooding gate cannot exhaust the runner', async () => {
    const script = "process.stdout.write('x'.repeat(300000)); process.stdout.write('TAIL');";
    const r = await runProc(process.execPath, ['-e', script], { maxOutput: 100_000 });
    expect(r.code).toBe(0);
    expect(r.stdout.length).toBeLessThanOrEqual(100_000);
    expect(r.stdout.endsWith('TAIL')).toBe(true);
    expect(r.truncated).toBe(true);
  });

  it('a multibyte character split across two output chunks arrives whole', async () => {
    const r = await runProc(process.execPath, ['-e', "process.stdout.write('\\u20ac'.repeat(300000))"]);
    expect(r.stdout).toBe('€'.repeat(300000));
    expect(r.truncated).toBe(false);
  });
});

describe('child lifetime', () => {
  afterEach(() => vi.useRealTimers());

  it('a child spawned without a timeout (git, and the hooks it runs) is still killed at the default ceiling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const p = runProc(process.execPath, ['-e', 'setTimeout(() => {}, 600000)']);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);
    vi.useRealTimers();
    const r = await p;
    expect(r.timedOut).toBe(true);
  });
});

describe('runner abort', () => {
  it('killAll ends every live child tree, so an aborted run leaves no claude spending', async () => {
    const p = runProc(process.execPath, ['-e', 'setTimeout(() => {}, 600000)'], { timeoutMs: 600_000 });
    await new Promise((r) => setTimeout(r, 200));
    await killAll();
    const r = await p;
    expect(r.code === 0).toBe(false);
  });
});

describe('fleet values that reach git argv', () => {
  const fleet = (base: string) => `repos:\n  - slug: r\n    path: /x\n    base: ${JSON.stringify(base)}\n    gates: [npm test]\n`;
  it.each(['--output=/tmp/pwn', '-c core.hooksPath=/tmp', 'main\nHEAD', 'ma in'])('rejects base %j, which git would read as an option or a second argument', (base) => {
    expect(() => parseFleet(fleet(base), 'f.yml')).toThrow(/base/);
  });
  it.each(['main', 'origin/main', 'release/1.2', 'v2.0.0', 'a1b2c3d', 'HEAD~1'])('accepts base %j', (base) => {
    expect(parseFleet(fleet(base), 'f.yml')[0]?.base).toBe(base);
  });
});
