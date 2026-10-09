// getLedger(): the deep project's hash-chained events as the index holds them. Live, the fake group's ledgerline
// (gitlab id 90010001) after one poll imported belay-ledger/events/90010001.jsonl; demo, none (no index is reached).
import { beforeAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { verifyChain } from '@/schemas/ledger';
import { ledgerEvents } from '@/server/gitlab/fake/demo/ledger';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { SEED_NOW } from '@/server/index/seed';
import { demoSource } from '../demoSource';
import { replayClock } from '../live/clock';
import { liveSource } from '../live/liveSource';
import { buildSnapshot } from '../live/snapshot';
import type { DataSource } from '../types';
import { fakeGroupLive } from './fakeGroup';

let live: DataSource;
beforeAll(async () => {
  ({ live } = await fakeGroupLive());
}, 60_000);

describe('getLedger()', () => {
  it('live: the 7 events of the fake ledger for ledgerline, in seq order, and they verify', () => {
    const events = live.getLedger();
    expect(events).toEqual(ledgerEvents(SEED_NOW));
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(verifyChain(events)).toBeNull();
  });

  it('live: a deep project with no row (so no gitlab id) reads []', async () => {
    const snap = await buildSnapshot(await memoryIndex(), replayClock.read(), 'ledgerline', DEMO);
    expect(liveSource(() => snap).getLedger()).toEqual([]);
  });

  it('demo: [] (the demo dataset has no ledger)', () => {
    expect(demoSource.getLedger()).toEqual([]);
  });
});
