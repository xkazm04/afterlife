import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { LEDGER_COLS, TABLE_SPECS } from '../../repositories';
import { memoryIndex } from '../memoryIndex';

vi.mock('server-only', () => ({}));

// Columns a table has that its upsert spec deliberately never writes (generated, or written by another statement).
const NOT_UPSERTED: Record<string, string[]> = {
  ledger_event: ['project_id', 'at_ts'], // the insert names them beside LEDGER_COLS
  task: ['ord'], proposal: ['ord'], // generated always as identity
};

async function columnsOf(table: string): Promise<string[]> {
  const db = await memoryIndex();
  const { rows } = await db.query<{ column_name: string }>(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`, [table],
  );
  return rows.map((r) => r.column_name).sort();
}

describe('repository column lists against the migrated schema', () => {
  it('give every TableSpec exactly the columns of its table (a column added by a migration must reach its spec)', async () => {
    const db = await memoryIndex();
    const bad: string[] = [];
    for (const spec of TABLE_SPECS) {
      const { rows } = await db.query<{ column_name: string }>(
        `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`, [spec.table],
      );
      const have = rows.map((r) => r.column_name).sort();
      const want = Object.keys(spec.cols).sort();
      const skipped = NOT_UPSERTED[spec.table] ?? [];
      const missing = have.filter((c) => !want.includes(c) && !skipped.includes(c));
      const extra = want.filter((c) => !have.includes(c));
      if (missing.length || extra.length) bad.push(`${spec.table}: not in spec [${missing}], not in table [${extra}]`);
    }
    expect(bad).toEqual([]);
  });

  it('cover every declared spec (a TableSpec added without registerSpec is not checked)', () => {
    const root = path.join(__dirname, '../../repositories');
    const files = fs.readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts') && f !== 'sql.ts');
    const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    let declared = 0;
    for (const f of files) declared += (strip(fs.readFileSync(path.join(root, f), 'utf8')).match(/: TableSpec = /g) ?? []).length;
    expect(TABLE_SPECS).toHaveLength(declared);
    expect(new Set(TABLE_SPECS.map((s) => `${s.table}`)).size).toBe(declared);
  });

  it('give the ledger insert every column of ledger_event', async () => {
    const listed = LEDGER_COLS.split(',').map((c) => c.trim());
    expect(await columnsOf('ledger_event')).toEqual([...listed, ...NOT_UPSERTED.ledger_event!].sort());
  });

  // Inserts that name their columns by hand, outside any TableSpec. `left` are the columns the insert leaves to a default
  // or to a later statement (finishCommand writes outcome, exit_code and finished_at).
  const HAND_INSERTS: { table: string; file: string; left: string[] }[] = [
    { table: 'commands_run', file: 'commandsRun.ts', left: ['id', 'outcome', 'exit_code', 'finished_at'] },
    { table: 'cycle_record', file: 'ledger/cycles.ts', left: [] },
  ];

  it.each(HAND_INSERTS)('give the $table insert every column of the table (a column a migration adds must reach it)', async ({ table, file, left }) => {
    const src = fs.readFileSync(path.join(__dirname, '../../repositories', file), 'utf8');
    const m = new RegExp(String.raw`insert into ${table}\s*\(([^)]*)\)`).exec(src);
    expect(m, `no "insert into ${table} (...)" in ${file}`).not.toBeNull();
    const listed = (m as RegExpExecArray)[1]!.split(',').map((c) => c.trim());
    expect(await columnsOf(table)).toEqual([...listed, ...left].sort());
  });
});
