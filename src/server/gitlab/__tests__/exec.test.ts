import { describe, expect, it } from 'vitest';
import { defaultExec, type ExecFn } from '../adapter/exec';
import { createGlabAdapter } from '../adapter/glabAdapter';

// What defaultExec resolves when its 60 s timeout kills the child.
const TIMED_OUT = { code: 124, stdout: '', stderr: '\nglab: i/o timeout' };

describe('defaultExec: failure causes', () => {
  it('names an output overflow as an api failure that states the cap, not a missing binary', async () => {
    const err = await defaultExec(process.execPath, ['-e', 'process.stdout.write("x".repeat(70 * 1024 * 1024))']).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toMatchObject({ kind: 'api' });
    expect((err as Error).message).toMatch(/64 MiB/);
    expect((err as Error).message).not.toMatch(/cannot start/);
  }, 30_000);

  it('still reports a binary that cannot start as binary', async () => {
    await expect(defaultExec('afterlife-no-such-binary-xyz', [])).rejects.toMatchObject({ kind: 'binary' });
  });
});

describe('write timeout', () => {
  const adapterWith = (exec: ExecFn) => createGlabAdapter({ bin: 'glab', exec, sleep: async () => {} });
  const write = (p: ReturnType<typeof adapterWith>) => p.execute(p.plan.addNote({ project: 1, iid: 2, body: 'b' }));

  it('is reported as an unknown outcome, not a network failure', async () => {
    const err = await write(adapterWith(async () => TIMED_OUT)).then(() => null, (e: unknown) => e);
    expect(err).toMatchObject({ kind: 'api' });
    expect((err as Error).message).toMatch(/outcome unknown/);
  });

  it('leaves a read timeout as a network failure', async () => {
    const p = adapterWith(async () => TIMED_OUT);
    await expect(p.currentUser()).rejects.toMatchObject({ kind: 'network' });
  });
});
