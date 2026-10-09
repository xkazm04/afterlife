// A failed live start must not stick: the next start begins afresh, the failure is kept and named, and the pages retry
// no more often than the poll interval.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readDataConfig } from '../config';
import type { LivePort } from '../live/ports';
import { createLivePort } from '../live/ports';
import { lastStartFailure, readyRuntime, startRuntime } from '../live/runtime';
import { getDataSource } from '../select';

vi.mock('../live/ports', async (orig) => ({ ...(await orig<object>()), createLivePort: vi.fn() }));

const KEYS = ['belay.liveRuntime.starting', 'belay.liveRuntime.ready', 'belay.liveRuntime.failed'].map((k) => Symbol.for(k));
const holder = globalThis as unknown as Record<symbol, unknown>;
const reset = (): void => {
  (holder[Symbol.for('belay.liveRuntime.ready')] as { scheduler?: { stop(): void } } | undefined)?.scheduler?.stop();
  for (const k of KEYS) delete holder[k];
};
const ENV = { BELAY_MODE: 'live', BELAY_GITLAB: 'fake' };
const cfg = readDataConfig(ENV);
const quiet = (): void => undefined;
const mocked = vi.mocked(createLivePort);
let real: (k: 'fake' | 'glab') => Promise<LivePort>;

beforeEach(async () => {
  reset();
  real = (await vi.importActual<typeof import('../live/ports')>('../live/ports')).createLivePort;
  mocked.mockReset();
  mocked.mockRejectedValueOnce(new Error('glab is not logged in')).mockImplementation(real);
});
afterEach(() => {
  reset();
  vi.useRealTimers();
});

describe('a failed live start', () => {
  it('rejects, leaves no runtime, and keeps the failure', async () => {
    await expect(startRuntime(cfg, quiet)).rejects.toThrow('glab is not logged in');
    expect(readyRuntime()).toBeNull();
    expect(lastStartFailure()?.message).toBe('glab is not logged in');
  });

  it('is started afresh by the next startRuntime, and a success clears the failure', async () => {
    await expect(startRuntime(cfg, quiet)).rejects.toThrow();
    const rt = await startRuntime(cfg, quiet);
    expect(rt.snapshot).not.toBeNull();
    expect(readyRuntime()).toBe(rt);
    expect(mocked).toHaveBeenCalledTimes(2);
    expect(lastStartFailure()).toBeNull();
  });
});
