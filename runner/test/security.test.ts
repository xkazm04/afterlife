// The runner's trust boundary: what a lane's children (gates, setup, git hooks, claude) can reach. A lane agent
// may only edit files, but gates and hooks then RUN those files, so whatever the runner hands a child is the
// agent's to read.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { agentEnv, childEnv } from '../proc/proc';
import { runGates } from '../lane/verify';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-sec-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

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

  it('a gate the lane agent rewrote cannot read the tokens', async () => {
    plant(planted);
    fs.writeFileSync(path.join(tmp, 'probe.mjs'), "process.exit(process.env.GITLAB_TOKEN || process.env.ANTHROPIC_API_KEY ? 1 : 0);\n");
    expect(await runGates(['node probe.mjs'], tmp, 20_000)).toEqual({ ok: true });
  });
});
