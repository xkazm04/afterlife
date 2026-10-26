// A live start that fails after the seeded in-memory index is open must close that index: select.ts retries the start
// every poll interval, and each retry opens another one.
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readDataConfig } from '../../config';
import { startRuntime } from '../../live/runtime';

const opened: PGlite[] = [];
vi.mock('@/server/index/db', async (orig) => {
  const real = await orig<typeof import('@/server/index/db')>();
  return {
    ...real,
    openIndex: vi.fn(async (...a: Parameters<typeof real.openIndex>) => {
      const db = await real.openIndex(...a);
      vi.spyOn(db, 'close');
      opened.push(db);
      return db;
    }),
  };
});
vi.mock('../../live/snapshot', () => ({ buildSnapshot: vi.fn(() => Promise.reject(new Error('snapshot is broken'))) }));

const cfg = readDataConfig({ AFTERLIFE_MODE: 'live', AFTERLIFE_GITLAB: 'fake' });
afterEach(() => {
  for (const k of ['starting', 'ready', 'failed']) delete (globalThis as unknown as Record<symbol, unknown>)[Symbol.for(`afterlife.liveRuntime.${k}`)];
});

describe('a failed first refresh on the fake group', () => {
  it('closes the seeded index it opened, once per failed start', async () => {
    for (let n = 1; n <= 2; n++) {
      await expect(startRuntime(cfg, () => undefined)).rejects.toThrow('snapshot is broken');
      expect(opened).toHaveLength(n);
      expect(opened[n - 1]?.close).toHaveBeenCalledTimes(1);
    }
  });
});
