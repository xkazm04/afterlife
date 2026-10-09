import { createHash } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import type { Migration } from './parts';
// The steps live in steps/ (the structure gate's 10-file folder ceiling); each keeps its version, name and SQL, which is
// all migrate() keys on.
import { m0001 } from './steps/0001_fleet';
import { m0002 } from './steps/0002_work';
import { m0003 } from './steps/0003_ledger';
import { m0004 } from './steps/0004_operator';
import { m0005 } from './steps/0005_class_standing';
import { m0006 } from './steps/0006_record_counters';
import { m0007 } from './steps/0007_record_rules';
import { m0008 } from './steps/0008_ledger_verdict';
import { m0009 } from './steps/0009_class_cooldown';
import { m0010 } from './steps/0010_ledger_environment';

export const MIGRATIONS: readonly Migration[] = [m0001, m0002, m0003, m0004, m0005, m0006, m0007, m0008, m0009, m0010];

const checksum = (m: Migration): string => createHash('sha256').update(m.sql).digest('hex');

/**
 * Applies pending migrations in order, each in its own transaction. Safe to call on every start. `list`: the known
 * migrations (every one; a test passes a prefix to build an older index).
 */
export async function migrate(db: PGlite, list: readonly Migration[] = MIGRATIONS): Promise<number[]> {
  await db.exec(
    'create table if not exists belay_migration (version int primary key, name text not null, ' +
      'checksum text not null, applied_at timestamptz not null default now())',
  );
  const done = await db.query<{ version: number; checksum: string }>('select version, checksum from belay_migration');
  const known = new Map(list.map((m) => [m.version, m]));
  const applied = new Map(done.rows.map((r) => [r.version, r.checksum]));

  for (const v of applied.keys()) {
    if (!known.has(v)) throw new Error(`index was migrated by a newer Belay (migration ${v} is unknown)`);
  }
  const ran: number[] = [];
  for (const m of [...list].sort((a, b) => a.version - b.version)) {
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
