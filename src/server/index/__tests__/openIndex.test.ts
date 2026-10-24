import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';
import { indexDir, openIndex } from '../db';
import { MIGRATIONS, migrate } from '../migrations/migrate';
import { upsertGroups, listGroups } from '../repositories';

describe('the persistent index', () => {
  it('is created (with its parent folders) on first start and survives a restart', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-index-'));
    const dataDir = path.join(base, 'not', 'yet', 'there'); // BELAY_DATA_DIR that does not exist
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const first = await openIndex({ dataDir });
      await upsertGroups(first, ['core-banking']);
      await first.close();
      expect(fs.existsSync(indexDir(dataDir))).toBe(true);
      // the start that migrated the folder says so, naming every version it applied; the next start has nothing to say
      expect(log.mock.calls.map((c) => String(c[0]))).toEqual([
        `belay: index ${indexDir(dataDir)} migrated: applied ${MIGRATIONS.map((m) => m.version).join(', ')}`,
      ]);
      const second = await openIndex({ dataDir });
      expect(await listGroups(second)).toEqual(['core-banking']);
      await second.close();
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
      fs.rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  });

  it('names the migration whose sql failed, and records none of it', async () => {
    const db = new PGlite();
    const bad = { version: 99, name: 'bad_step', sql: 'alter table no_such_table add column x int;' };
    await expect(migrate(db, [...MIGRATIONS, bad])).rejects.toThrow(/^migration 99 \(bad_step\) failed: .*no_such_table/);
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from belay_migration where version = 99');
    expect(rows).toEqual([{ n: 0 }]);
    await db.close();
  });
});
