import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import type { MonitorData } from '../model/types';

// No DOM or renderer is installed: hooks run once, outside React, on a minimal shim. Enough for a callback that only reads refs and calls the server.
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  useState: (init: unknown) => [typeof init === 'function' ? (init as () => unknown)() : init, () => undefined],
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useRef: (init: unknown) => ({ current: init }),
}));
const repollAction = vi.fn();
vi.mock('@/server/actions/repollAction', () => ({ repollAction: (id: string) => repollAction(id) }));

import { useMonitor } from './useMonitor';

const stale = { id: 'p1', name: 'ledgerline', group: 'web', state: 'stale', needsYou: 0, feed: { ageSec: 900, ok: false } } as unknown as FleetProject;
const data: MonitorData = { mode: 'live', org: 'acme', asOf: '14:22', groups: ['web'], projects: [stale], stages: [], deepId: 'p1', needs: [] };

describe('useMonitor.repoll in live mode', () => {
  beforeEach(() => {
    repollAction.mockReset();
  });

  it('a second click while the poll runs does not start a second server poll', async () => {
    let finish!: (r: { ok: true }) => void;
    repollAction.mockReturnValue(new Promise((res) => (finish = res)));
    const say = vi.fn();
    const m = useMonitor(data);
    m.repoll('p1', say);
    m.repoll('p1', say);
    expect(repollAction).toHaveBeenCalledTimes(1);
    finish({ ok: true });
    await Promise.resolve();
    await Promise.resolve();
    expect(say).toHaveBeenLastCalledWith('Re-polled ledgerline');
  });

  it('polls again once the first poll has answered, ok or rejected', async () => {
    repollAction.mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ ok: true });
    const m = useMonitor(data);
    for (let i = 0; i < 3; i++) {
      m.repoll('p1', vi.fn());
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(repollAction).toHaveBeenCalledTimes(3);
  });
});
