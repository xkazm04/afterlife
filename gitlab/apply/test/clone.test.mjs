// clonePolicy's retry decisions, with git's spawn stubbed and the backoff sleep recorded, so nothing waits or hits a network.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spawn = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', async (orig) => ({ ...(await orig()), spawnSync: spawn }));
const { clonePolicy, setCloneSleep } = await import('../lib.mjs');

const cfg = { policy: { project: 'acme/belay-policy', branch: 'main' } };
const fail = (stderr) => ({ status: 128, stderr: `${stderr}\nsecond line\n` });
const ok = { status: 0, stderr: '' };

describe('clonePolicy retry', () => {
  const sleeps = [];
  let was;
  let backoff;
  beforeEach(() => {
    spawn.mockReset();
    sleeps.length = 0;
    was = setCloneSleep((ms) => sleeps.push(ms));
    backoff = process.env.AFTERLIFE_CLONE_BACKOFF_MS;
    delete process.env.AFTERLIFE_CLONE_BACKOFF_MS;
  });
  afterEach(() => {
    setCloneSleep(was);
    if (backoff === undefined) delete process.env.AFTERLIFE_CLONE_BACKOFF_MS;
    else process.env.AFTERLIFE_CLONE_BACKOFF_MS = backoff;
  });
  const run = () => clonePolicy(cfg, 'file:///x', 'dest-never-created');

  it('retries a transient failure and returns dest once a later attempt succeeds', () => {
    spawn.mockReturnValueOnce(fail('fatal: early EOF')).mockReturnValueOnce(fail('fatal: the remote end hung up unexpectedly\nerror: RPC failed')).mockReturnValueOnce(ok);
    expect(run()).toBe('dest-never-created');
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([500, 1000]);
  });

  it("throws git's first stderr line after 3 attempts and removes dest", () => {
    spawn.mockReturnValue(fail('fatal: early EOF'));
    const rm = vi.spyOn(fs, 'rmSync');
    expect(run).toThrow(/^cannot clone acme\/belay-policy: fatal: early EOF$/);
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(sleeps).toHaveLength(2);
    expect(rm).toHaveBeenLastCalledWith('dest-never-created', { recursive: true, force: true });
    rm.mockRestore();
  });

  it.each([
    'fatal: Authentication failed for the remote',
    "fatal: repository 'x' not found",
    'fatal: unable to access: The requested URL returned error: 403',
    'fatal: unable to access: The requested URL returned error: 401',
    'fatal: Remote branch nope not found in upstream origin',
  ])('%s is never retried', (msg) => {
    spawn.mockReturnValue(fail(msg));
    expect(run).toThrow(/^cannot clone /);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });

  it('an HTTP 503 is retried and the backoff is capped at 5 s', () => {
    process.env.AFTERLIFE_CLONE_BACKOFF_MS = '4000';
    spawn.mockReturnValueOnce(fail('fatal: unable to access: The requested URL returned error: 503')).mockReturnValueOnce(fail('fatal: unable to access: The requested URL returned error: 503')).mockReturnValueOnce(ok);
    run();
    expect(sleeps).toEqual([4000, 5000]);
  });

  it('a failure that is neither transient nor permanent is not retried', () => {
    spawn.mockReturnValue(fail('fatal: something odd'));
    expect(run).toThrow(/something odd/);
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});
