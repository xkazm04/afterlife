// A failed live start must not stick: the next start begins afresh, the failure is kept and named, and the pages retry
// no more often than the poll interval.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootLive } from '../boot';
import { readDataConfig } from '../config';
import type { LivePort } from '../live/ports';
import { createLivePort } from '../live/ports';
import { lastStartFailure, readyRuntime, startInFlight, startRuntime } from '../live/runtime';
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

describe('a first poll cycle that throws', () => {
  it('fails the start, so the pages name it, not an empty fleet as if it were real', async () => {
    mocked.mockReset();
    mocked.mockImplementation(real);
    const onError = vi.fn();
    vi.stubEnv('BELAY_MODE', 'live'); // the poller reads a real group's config, and none is set: runPollCycle throws
    try {
      await expect(startRuntime(cfg, onError)).rejects.toThrow(/BELAY_GROUP_ID is not set/);
    } finally {
      vi.unstubAllEnvs();
    }
    expect([readyRuntime(), onError.mock.calls.length]).toEqual([null, 0]);
    expect(lastStartFailure()?.message).toMatch(/BELAY_GROUP_ID is not set/);
  });
});

describe('the pages after a failed start', () => {
  const read = (): unknown => getDataSource(ENV).getFleet();

  it('name the start failure, not an unfinished first poll', async () => {
    await expect(startRuntime(cfg, quiet)).rejects.toThrow();
    expect(read).toThrow(/live start failed.*glab is not logged in/s);
  });

  it('keep the old message while no start has run', () => {
    expect(read).toThrow(/first poll has not finished/);
    expect(mocked).toHaveBeenCalledTimes(0);
  });

  it('start at most one retry inside the interval, and another once it has passed', async () => {
    await expect(startRuntime(cfg, quiet)).rejects.toThrow();
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(read).toThrow();
    expect(read).toThrow();
    expect(mocked).toHaveBeenCalledTimes(1); // inside the interval: no retry
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 31_000);
    expect(read).toThrow();
    expect(read).toThrow();
    expect(mocked).toHaveBeenCalledTimes(2); // one retry, the second read sees it in flight
    await vi.waitFor(() => expect(readyRuntime()).not.toBeNull());
  });

  it("say in the log when a page's retry brings live data up, as bootLive says a first start", async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(quiet);
    await expect(startRuntime(cfg, quiet)).rejects.toThrow();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 31_000);
    expect(read).toThrow();
    await vi.waitFor(() => expect(log.mock.calls.map((c) => String(c[0]))).toEqual([expect.stringMatching(/^belay: live data from the seeded fake GitLab .*after a failed start/)]));
    log.mockRestore();
  });
});

describe('bootLive', () => {
  let lines: string[] = [];
  let log: { mockRestore(): void };
  const fake = (broken = false): Promise<LivePort> =>
    real('fake').then((p) => (broken ? { ...p, port: new Proxy(p.port, { get: (t, k, r) => (k === 'getGroup' ? () => Promise.reject(new Error('group is gone')) : Reflect.get(t, k, r)) }) } : p));

  beforeEach(() => {
    lines = [];
    log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => void lines.push(String(m)));
    mocked.mockReset();
  });
  afterEach(() => log.mockRestore());

  it('demo mode starts nothing and says nothing', async () => {
    await bootLive({});
    expect([mocked.mock.calls.length, lines]).toEqual([0, []]);
  });

  it('live on the fake group names the replay clock and the polled projects', async () => {
    mocked.mockImplementation(() => fake());
    await bootLive(ENV);
    expect(lines).toEqual([expect.stringMatching(/^belay: live data from the seeded fake GitLab \(replay clock\); \d+ project\(s\) polled$/)]);
  });

  it('a failed start does not reject: the server must come up so its pages can name the failure and retry', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(quiet);
    mocked.mockRejectedValue(new Error('glab is not logged in'));
    await expect(bootLive(ENV)).resolves.toBeUndefined();
    expect(err.mock.calls.map((c) => String(c[0]))).toEqual([expect.stringMatching(/^belay: live start failed: glab is not logged in; .*retried every 30s/)]);
    expect(lastStartFailure()?.message).toBe('glab is not logged in');
    err.mockRestore();
  });

  it('live on glab names glab, and a group that cannot be read is named', async () => {
    mocked.mockImplementation(() => fake(true));
    await bootLive({ BELAY_MODE: 'live', BELAY_GITLAB: 'glab' });
    expect(lines).toEqual(['belay: live data from glab; 0 project(s) polled, group error: group is gone']);
  });
});

describe('the cycle log', () => {
  it('names a group error once when it starts, not on the cycles it stands, and once when it clears', async () => {
    let broken = true;
    mocked.mockReset();
    mocked.mockImplementation(() =>
      real('fake').then((p) => ({ ...p, port: new Proxy(p.port, { get: (t, k, r) => (k === 'getGroup' && broken ? () => Promise.reject(new Error('group is gone')) : Reflect.get(t, k, r)) }) })),
    );
    const lines: string[] = [];
    const rt = await startRuntime(cfg, quiet, (l) => void lines.push(l));
    await rt.refresh();
    await rt.refresh();
    broken = false;
    await rt.refresh();
    await rt.refresh();
    expect(lines.filter((l) => l.includes('group is gone'))).toEqual([
      'belay: poll cycle 1 new: group: group is gone (1 standing)',
      expect.stringMatching(/^belay: poll cycle .*cleared: group: group is gone/),
    ]);
  });
});

describe('startInFlight', () => {
  it('is true only between a start beginning and it finishing, either way (begun, neither ready nor failed)', async () => {
    mocked.mockReset();
    mocked.mockRejectedValueOnce(new Error('glab is not logged in')).mockImplementation(() => real('fake'));
    expect(startInFlight()).toBe(false);
    const failing = startRuntime(cfg, quiet);
    expect(startInFlight()).toBe(true);
    await expect(failing).rejects.toThrow();
    expect(startInFlight()).toBe(false);
    const ok = startRuntime(cfg, quiet);
    expect(startInFlight()).toBe(true);
    await ok;
    expect(startInFlight()).toBe(false);
  });
});
