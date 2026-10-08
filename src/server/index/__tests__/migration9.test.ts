// Migration 0009 adds class_tier.cooldown_until. A populated index at version 8 (rows written before the column existed)
// migrates to 9 with every row kept, the new column null, and the repository reading it back.
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS, migrate } from '../migrations/migrate';
import { listClassTiers, upsertClassTiers } from '../repositories/fleet/classTier';

describe('migration 0009 on a populated version-8 index', () => {
  it('keeps every class_tier row, adds cooldown_until null, and the repository reads and writes it', async () => {
    const db = new PGlite();
    expect(await migrate(db, MIGRATIONS.filter((m) => m.version <= 8))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    await db.exec(`
      insert into fleet_group (path, ord) values ('core-banking', 0);
      insert into project (id, name, group_path, state) values ('ledgerline', 'ledgerline', 'core-banking', 'watching');
      insert into trust_class (id, ord, track, ceiling) values ('code-fix.patch', 0, 1, 'hands_off');
      insert into class_tier (project_id, class_id, tier, since, set_by, accepted, reverts, move_kind)
        values ('ledgerline', 'code-fix.patch', 'assisted', '2026-10-01T00:00:00Z', 'tripwire', 3, 0, 'tripwire');
    `);
    expect(await migrate(db)).toEqual([9]);
    const [row] = await listClassTiers(db, 'ledgerline');
    expect(row).toMatchObject({ classId: 'code-fix.patch', tier: 'assisted', setBy: 'tripwire', record: { accepted: 3, reverts: 0 }, cooldownUntil: null });
    await upsertClassTiers(db, [{ ...row!, cooldownUntil: new Date('2026-10-28T00:00:00Z') }]);
    expect((await listClassTiers(db, 'ledgerline'))[0]?.cooldownUntil).toEqual(new Date('2026-10-28T00:00:00Z'));
  });
});
