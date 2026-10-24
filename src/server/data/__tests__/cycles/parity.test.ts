// Demo vs live for the cycle screens (Cycles, its estate scope, Onboard): the same fake-group rig as ../parity.test.ts,
// the live source fed by a poll of the demo GitLab, whose belay-ledger also holds the deep project's closed cycles.
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadCyclesData } from '@/app/features/cycles/data/loadCyclesData';
import { loadEstateData } from '@/app/features/cycles/data/loadEstateData';
import { loadOnboardData } from '@/app/features/onboard/data/loadOnboardData';
import { listCycleRecords } from '@/server/index/repositories/ledger/cycles';
import { demoSource } from '../../demoSource';
import { setDataSource } from '../../select';
import type { DataSource } from '../../types';
import { fakeGroupLive } from '../fakeGroup';

let live: DataSource;
let db: PGlite;
beforeAll(async () => {
  ({ db, live } = await fakeGroupLive());
}, 60_000);
afterAll(() => setDataSource(null));

/** What the loaders return, as the page would send it to the client: JSON, so `undefined` and a missing key are the same. */
const asProps = (v: unknown): unknown => JSON.parse(JSON.stringify(v)) as unknown;

/** The fixture spells "no last event" as null on six projects; the index view leaves the key out. Both draw nothing. */
const noLast = (v: unknown): unknown => JSON.parse(JSON.stringify(v), (k: string, x: unknown) => (k === 'last' && x === null ? undefined : x)) as unknown;

/**
 * The deep project's needsYou excludes the seeded items live (../parity.test.ts lists it where live differs); its armed,
 * last and webUrl are what the poll read (../live/projectFields.test.ts).
 */
const POLLED = new Set(['needsYou', 'armed', 'last', 'webUrl']);
const noDeepNeeds = (v: unknown): unknown =>
  JSON.parse(JSON.stringify(v), function (this: Record<string, unknown>, k: string, x: unknown) {
    if (!POLLED.has(k) || (this.id !== 'ledgerline' && this.name !== 'ledgerline')) return x;
    return k === 'webUrl' ? undefined : null;
  }) as unknown;

function both<T>(read: () => T): [T, T] {
  setDataSource(demoSource);
  const d = read();
  setDataSource(live);
  const l = read();
  setDataSource(null);
  return [d, l];
}

describe('the cycle screens get the same data from the live source as from the demo source', () => {
  it('Cycles: the replayed history over the live scan reconciles exactly as it does over the demo one', () => {
    const [d, l] = both(() => asProps(loadCyclesData()));
    expect(l).toEqual(d);
    expect((l as { drift: string[] }).drift).toEqual([]);
    expect((l as { project: string }).project).toBe('acme-lab/ledgerline');
  });

  it('Cycles names the live group and deep project, not the demo literal', () => {
    const other: DataSource = { ...live, deepProjectId: () => 'payroll', getPortfolio: () => ({ ...live.getPortfolio(), group: 'north-co' }) };
    setDataSource(other);
    const v = loadCyclesData();
    setDataSource(null);
    expect(v.project).toBe('north-co/payroll');
  });

  it('Cycles, estate scope: every project in cycles per group, each history replayed against its rungs', () => {
    const [d, l] = both(() => asProps(loadEstateData()));
    expect(l).toEqual(d);
    expect((l as { inCycles: number; reconciled: number })).toMatchObject({ inCycles: 6, reconciled: 6 });
  });

  it('Onboard: the whole estate, its groups and the deep project in cycles', () => {
    const [d, l] = both(() => noDeepNeeds(loadOnboardData()));
    expect(noLast(l)).toEqual(noLast(d));
  });
});

describe('the poll really did write the cycles (it is not just the demo fixture)', () => {
  it('the cycle history comes from belay-ledger/cycles/<id>.jsonl', async () => {
    const stored = await listCycleRecords(db, 'ledgerline');
    expect(stored.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(stored.at(-1)?.closed_at).toBe('2026-10-06T14:02:00.000Z');
    expect(live.getCycles()).not.toBe(demoSource.getCycles());
    expect(live.getCycles().today).toBe(42);
  });
});
