import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STAGES } from '@/schemas/stages';
import { TIER_ORDER } from '@/schemas/tier';
import { MIGRATIONS, migrate } from '../migrations/migrate';
import { CEILINGS, STAGE_LIST, TIERS } from '../migrations/parts';
import { memoryIndex } from './memoryIndex';

vi.mock('server-only', () => ({}));

const TABLES = [
  'pairing', 'setup_step', 'ledger_event', 'task', 'proof', 'proposal', 'stage_cell', 'poll_state', 'commands_run',
  'fleet_group', 'trust_class', 'project', 'project_stage', 'class_tier', 'action_runs', 'cycle_record', 'belay_migration',
];

describe('migrations', () => {
  it('create exactly the listed tables (a table a migration adds must be listed here)', async () => {
    const db = await memoryIndex();
    const { rows } = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public'`,
    );
    expect(rows.map((r) => r.table_name).sort()).toEqual([...TABLES].sort());
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

  it('retries after a failed open instead of replaying the rejection until restart', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-index-'));
    dirs.push(dir);
    const blocker = path.join(dir, 'blocked');
    fs.writeFileSync(blocker, 'a file where the data folder should be');
    process.env.BELAY_DATA_DIR = blocker;
    const { getIndex } = await import('../db');
    await expect(getIndex()).rejects.toThrow();

    process.env.BELAY_DATA_DIR = path.join(dir, 'fixed');
    const db = await getIndex();
    expect((await db.query('select 1 as one')).rows).toEqual([{ one: 1 }]);
  });

  it('closes the handle when the migrations refuse the folder, so a retry does not open it twice', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-index-'));
    dirs.push(dir);
    const { openIndex, indexDir } = await import('../db');
    const first = await openIndex({ dataDir: dir });
    await first.query(`insert into belay_migration (version, name, checksum) values (99, 'future', 'x')`);
    await first.close();

    const close = vi.spyOn(PGlite.prototype, 'close');
    try {
      await expect(openIndex({ dataDir: dir })).rejects.toThrow(/newer Belay/);
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      close.mockRestore();
    }
    expect(fs.existsSync(indexDir(dir))).toBe(true);
  });

  it('opens in memory for tests', async () => {
    const { openIndex } = await import('../db');
    const db = await openIndex({ memory: true });
    expect((await db.query('select 1 as one')).rows).toEqual([{ one: 1 }]);
    await db.close();
  });
});

// Frozen: an applied migration is keyed by the sha256 of its sql (migrate.ts), and a changed hash stops every existing
// index from starting ("changed after it was applied"). A new migration is appended; none of these is ever edited.
const FROZEN: Record<number, string> = {
  1: '103a5d39223835cd0ecd341a983bca484a822808697f0790fb854f1584aede51',
  2: 'c75f1c033f780a0e19e6c412b349f59fbe736a5b98cfa6e4c6270a5c5520e798',
  3: '9c7d6879100b42a211ad48e6049e3bca1a7b9b6f96266f553c9d4a6f96801fdc',
  4: 'c6dd33ff558564850879c9426bf7ddc1edda0945e6f6c3d2740bfc59fbaffaf4',
  5: '9006c7e53f423ca1b1259b00dff51a5f8af9ff0f5999ed15cbcbca75a5ba3b58',
  6: '1ccc42cc3db5521ff392b7b9fb213a5c3964bafae3ec9311c72124b2cb1332d9',
  7: 'e45954944c5e468e7d8d1f1e8a2e44ae9ee22e08eddbb0faa6ed9dba8010782d',
  8: 'aa4f08b15b7ce2e8b03db3f4626a27411d788a2c3abb203cddc106d12e2486da',
  9: 'e9e71c3a607bd24ccf0e509e843f9a28b25ab83c2efcd17df10a6197c6efddba',
  10: '0197eb196f70806a2f9631ccda0c1468695eef01e0f835f65b90fdba667726b4',
  11: '8d7a0fe5d1b9af8c600d6908947820efaaefc26f7a415cc5039381664fae305e',
  12: 'd7bec144b53b4282ab69a5c490cbb673b8eba32d0f3c55900901cb96f5fea2fa',
  13: '50530e13c25aa95596d866f38c82769f22f9fb572c14aa0dc8543afff2ab555d',
  14: '9114147ecbf6cc85c6b6112a891735e510e6ad38616c0dfb51dc3faa5d30071c',
  15: '684764e531f619c1567aad46288cda13dac0b7ae2a14a07b0f3c53e12f3bccb2',
  16: '9dc4aa0739559de9f714178e93162df20fa857b16b450d6ff1d41c7aff1e3f1f',
  17: '9e45259b7e40e4c2999b0366d6a7f17a2a7fa73058027aac44340b3b58865cc8',
};
const sha = (sql: string): string => createHash('sha256').update(sql).digest('hex');
const quoted = (xs: readonly string[]): string => `(${xs.map((x) => `'${x}'`).join(', ')})`;

describe('applied migrations stay frozen', () => {
  it('keep the sql each shipped index was migrated with', () => {
    for (const m of MIGRATIONS) if (FROZEN[m.version]) expect([m.version, sha(m.sql)]).toEqual([m.version, FROZEN[m.version]]);
    // every migration on main has shipped: a new one adds its hash here in the commit that adds it
    expect(MIGRATIONS.filter((m) => !FROZEN[m.version]).map((m) => m.version)).toEqual([]);
  });

  it('do not read a live schema constant: adding a stage must not change migrations 1 and 2', async () => {
    vi.resetModules();
    vi.doMock('@/schemas/stages', async (actual) => {
      const real = await actual<typeof import('@/schemas/stages')>();
      return { ...real, STAGES: [...real.STAGES, 'tenth'] };
    });
    try {
      const { MIGRATIONS: edited } = await import('../migrations/migrate');
      expect(edited.map((m) => sha(m.sql))).toEqual(MIGRATIONS.map((m) => sha(m.sql)));
    } finally {
      vi.doUnmock('@/schemas/stages');
      vi.resetModules();
    }
  });

  it('freeze lists that still equal the schema today, so changing the schema asks for a new migration', () => {
    expect(STAGE_LIST).toBe(quoted(STAGES));
    expect(TIERS).toBe(quoted(TIER_ORDER));
    expect(CEILINGS).toBe(quoted([...TIER_ORDER, 'human_only']));
  });
});

describe('README', () => {
  it('names every migration, by its four-digit version', () => {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
    const missing = MIGRATIONS.map((m) => String(m.version).padStart(4, '0')).filter((v) => !readme.includes(v));
    expect(missing).toEqual([]);
  });
});
