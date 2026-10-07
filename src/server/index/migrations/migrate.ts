import { createHash } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { m0001 } from './0001_fleet';
import { m0002 } from './0002_work';
import { m0003 } from './0003_ledger';
import { m0004 } from './0004_operator';
import { m0005 } from './0005_class_standing';
import type { Migration } from './parts';

export const MIGRATIONS: readonly Migration[] = [m0001, m0002, m0003, m0004, m0005];

const checksum = (m: Migration): string => createHash('sha256').update(m.sql).digest('hex');

/** Applies pending migrations in order, each in its own transaction. Safe to call on every start. */
export async function migrate(db: PGlite): Promise<number[]> {
  await db.exec(
    'create table if not exists belay_migration (version int primary key, name text not null, ' +
      'checksum text not null, applied_at timestamptz not null default now())',
  );
  const done = await db.query<{ version: number; checksum: string }>('select version, checksum from belay_migration');
  const known = new Map(MIGRATIONS.map((m) => [m.version, m]));
  const applied = new Map(done.rows.map((r) => [r.version, r.checksum]));

  for (const v of applied.keys()) {
    if (!known.has(v)) throw new Error(`index was migrated by a newer Belay (migration ${v} is unknown)`);
  }
  const ran: number[] = [];
  for (const m of [...MIGRATIONS].sort((a, b) => a.version - b.version)) {
    const prev = applied.get(m.version);
    if (prev !== undefined) {
      if (prev !== checksum(m)) throw new Error(`migration ${m.version} (${m.name}) changed after it was applied`);
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query('insert into belay_migration (version, name, checksum) values ($1, $2, $3)', [m.version, m.name, checksum(m)]);
    });
    ran.push(m.version);
  }
  return ran;
}
