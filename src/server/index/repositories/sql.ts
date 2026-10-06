// Shared SQL plumbing. Every statement in the index is parameterised: values travel as $n parameters (rows travel
// as one jsonb document), and identifiers come only from the constant TableSpecs declared next to each repository.

export interface Queryable {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

/** table, column -> postgres type (used to read a jsonb row document), and the conflict key. */
export interface TableSpec {
  readonly table: string;
  readonly cols: Readonly<Record<string, string>>;
  readonly key: readonly string[];
}

/** Insert or update many rows in one statement. Row keys are the column names; a missing key is NULL. */
export async function upsertRows(db: Queryable, spec: TableSpec, rows: readonly object[]): Promise<void> {
  if (rows.length === 0) return;
  const names = Object.keys(spec.cols);
  const defs = names.map((c) => `${c} ${spec.cols[c]}`).join(', ');
  const sets = names.filter((c) => !spec.key.includes(c));
  const onConflict = sets.length ? `do update set ${sets.map((c) => `${c} = excluded.${c}`).join(', ')}` : 'do nothing';
  await db.query(
    `insert into ${spec.table} (${names.join(', ')}) select ${names.join(', ')} ` +
      `from jsonb_to_recordset($1::jsonb) as x(${defs}) on conflict (${spec.key.join(', ')}) ${onConflict}`,
    [JSON.stringify(rows)],
  );
}

export const toIso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** timestamptz columns come back as Date (or null). */
export const asDate = (v: Date | string | null): Date | null => (v === null ? null : v instanceof Date ? v : new Date(v));
