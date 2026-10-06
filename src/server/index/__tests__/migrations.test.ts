import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MIGRATIONS, migrate } from '../migrations/migrate';
import { memoryIndex } from './memoryIndex';

vi.mock('server-only', () => ({}));

const TABLES = [
  'pairing', 'setup_step', 'ledger_event', 'task', 'proof', 'proposal', 'stage_cell', 'poll_state', 'commands_run',
  'fleet_group', 'trust_class', 'project', 'project_stage', 'class_tier',
];

describe('migrations', () => {
  it('create every table of the plan, plus the fleet tables', async () => {
    const db = await memoryIndex();
    const { rows } = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const names = rows.map((r) => r.table_name);
    for (const t of TABLES) expect(names).toContain(t);
  });

  it('are idempotent: a second run applies nothing and changes nothing', async () => {
    const db = await memoryIndex();
    const before = await db.query('select version, name, checksum from belay_migration order by version');
    expect(await migrate(db)).toEqual([]);
    expect(await migrate(db)).toEqual([]);
    const after = await db.query('select version, name, checksum from belay_migration order by version');
    expect(after.rows).toEqual(before.rows);
    expect(after.rows).toHaveLength(MIGRATIONS.length);
  });

  it('apply only the pending ones on an older database', async () => {
    const db = new PGlite();
    await migrate(db);
    await db.exec('drop table commands_run, poll_state, setup_step, pairing; delete from belay_migration where version = 4');
    expect(await migrate(db)).toEqual([4]);
  });

  it('refuse a migration edited after it was applied, and a database from a newer Belay', async () => {
    const edited = await memoryIndex();
    await edited.query(`update belay_migration set checksum = 'x' where version = 1`);
    await expect(migrate(edited)).rejects.toThrow(/changed after it was applied/);

    const newer = await memoryIndex();
    await newer.query(`insert into belay_migration (version, name, checksum) values (99, 'future', 'x')`);
    await expect(migrate(newer)).rejects.toThrow(/newer Belay/);
  });
});

describe('db.ts', () => {
  const dirs: string[] = [];
  afterEach(async () => {
    const { closeIndex } = await import('../db');
    await closeIndex();
    delete process.env.BELAY_DATA_DIR;
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  it('opens one shared instance at BELAY_DATA_DIR and keeps data across a restart', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-index-'));
    dirs.push(dir);
    process.env.BELAY_DATA_DIR = dir;
    const { getIndex, closeIndex, indexDir } = await import('../db');
    expect(indexDir()).toBe(path.join(dir, 'index'));

    const db = await getIndex();
    expect(await getIndex()).toBe(db);
    await db.query(`insert into fleet_group (path, ord) values ('core', 0)`);
    await closeIndex();

    const again = await getIndex();
    expect(again).not.toBe(db);
    const { rows } = await again.query<{ path: string }>('select path from fleet_group');
    expect(rows).toEqual([{ path: 'core' }]);
  });

  it('opens in memory for tests', async () => {
    const { openIndex } = await import('../db');
    const db = await openIndex({ memory: true });
    expect((await db.query('select 1 as one')).rows).toEqual([{ one: 1 }]);
    await db.close();
  });
});
