// Loads src/lib/demo/data/belay-demo.json into the index: for tests, and for a "live mode with demo data" switch.
// Every value is written as the index stores it (instants, deadlines, counts); the views turn it back into the
// demo's display strings, which is what the round-trip tests compare. Idempotent: running it twice changes nothing.
import { LEDGERLINE_ID } from '@/lib/demo';
import type { Queryable } from '../repositories/sql';
import { seedClassRecords, seedInbox, seedMaturity, seedTasks } from './seedDeep';
import { seedFleet } from './seedFleet';
import { SEED_NOW } from './parse';

export { SEED_NOW };

export interface SeedOptions {
  /** The instant every relative value in the fixture is anchored to. Views must read with the same `now`. */
  now?: Date;
  /** The project the fixture goes deep on. */
  deepProject?: string;
}

/** Pass a transaction (or the db) from PGlite. */
export async function seedDemo(db: Queryable, opts: SeedOptions = {}): Promise<void> {
  const now = opts.now ?? SEED_NOW;
  const deep = opts.deepProject ?? LEDGERLINE_ID;
  await seedFleet(db, now);
  await seedClassRecords(db, deep, now);
  await seedInbox(db, deep, now);
  await seedMaturity(db, deep, now);
  await seedTasks(db, deep, now);
}
