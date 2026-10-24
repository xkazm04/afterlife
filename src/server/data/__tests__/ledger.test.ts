// getLedger(): the deep project's hash-chained events as the index holds them. Live, the fake group's ledgerline
// (gitlab id 90010001) after one poll imported belay-ledger/events/90010001.jsonl; demo, none (no index is reached).
import type { PGlite } from '@electric-sql/pglite';
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
let db: PGlite;
beforeAll(async () => {
  ({ live, db } = await fakeGroupLive());
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

describe('getLedgerCheck()', () => {
  it('live: the snapshot verified the polled chain once, and it holds', () => {
    expect(live.getLedgerCheck()).toEqual({ hash: 'sha256', brokenAt: null });
  });

  it('live: a chain edited in the index since its import reads broken at the edited seq', async () => {
    // The table refuses updates (append-only trigger): a forger past the app turns it off first.
    await db.exec("alter table ledger_event disable trigger user; update ledger_event set payload_ref = 'proofs/forged.json' where project_id = 90010001 and seq = 3");
    const snap = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO);
    expect(liveSource(() => snap).getLedgerCheck()).toEqual({ hash: 'sha256', brokenAt: 3 });
  });

  it('demo: the empty chain holds', () => {
    expect(demoSource.getLedgerCheck()).toEqual({ hash: 'sha256', brokenAt: null });
  });
});
