import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runGates } from '../lane/verify';

describe('runGates retries', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-gates-'));
    // Red on its first run, green after: what a load flake looks like from outside.
    fs.writeFileSync(path.join(tmp, 'flake.mjs'), "import fs from 'node:fs';\nif (fs.existsSync('ran')) process.exit(0);\nfs.writeFileSync('ran', '');\nconsole.log('socket aborted');\nprocess.exit(1);\n");
    fs.writeFileSync(path.join(tmp, 'red.mjs'), "console.log('1 failed');\nprocess.exit(1);\n");
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('without retries the first red run counts', async () => {
    const v = await runGates(['node flake.mjs'], tmp, 20_000);
    expect(v.ok).toBe(false);
    expect(v.tail).toBe('socket aborted');
  });

  it('a gate green on its rerun passes and is named flaky', async () => {
    expect(await runGates(['node flake.mjs'], tmp, 20_000, 1)).toEqual({ ok: true, flaky: ['node flake.mjs'] });
  });

  it('a gate red on every run stays red and says how many runs', async () => {
    const v = await runGates(['node flake.mjs', 'node red.mjs'], tmp, 20_000, 1);
    expect(v).toMatchObject({ ok: false, failed: 'node red.mjs (exit 1, 2 runs)', tail: '1 failed', flaky: ['node flake.mjs'] });
  });
});
