// Feed health. A stale feed must look stale: age is computed from the last good poll, and a failed poll keeps
// the last good time (so "47 min ago" stays true) while recording the error.
import type { FeedStatus } from '@/lib/demo/types';
import { asDate, type Queryable } from './sql';

export interface PollStateRow {
  source: string;
  lastOk: Date | null;
  lastError: string | null;
}

/** The poll source the Fleet row of a project reads. */
export const projectSource = (projectId: string): string => `project:${projectId}`;

/**
 * The poll source of a group's belay-policy files (trust-policy.yml, tier-state.yml): failed while the last poll could not
 * read or parse them, so the class tiers Ladder shows are the last good read's.
 */
export const policySource = (group: number | string): string => `policy:${group}`;

interface Db {
  source: string;
  last_ok: Date | null;
  last_error: string | null;
}

const fromDb = (r: Db): PollStateRow => ({ source: r.source, lastOk: asDate(r.last_ok), lastError: r.last_error });

export async function recordPollOk(db: Queryable, source: string, at: Date): Promise<void> {
  await db.query(
    `insert into poll_state (source, last_ok, last_error) values ($1, $2::timestamptz, null)
     on conflict (source) do update set last_ok = excluded.last_ok, last_error = null`,
    [source, at.toISOString()],
  );
}

export async function recordPollError(db: Queryable, source: string, error: string): Promise<void> {
  await db.query(
    `insert into poll_state (source, last_ok, last_error) values ($1, null, $2)
     on conflict (source) do update set last_error = excluded.last_error`,
    [source, error],
  );
}

export async function setPollStates(db: Queryable, rows: readonly PollStateRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db.query(
    `insert into poll_state (source, last_ok, last_error)
     select source, last_ok, last_error from jsonb_to_recordset($1::jsonb) as x(source text, last_ok timestamptz, last_error text)
     on conflict (source) do update set last_ok = excluded.last_ok, last_error = excluded.last_error`,
    [JSON.stringify(rows.map((r) => ({ source: r.source, last_ok: r.lastOk?.toISOString() ?? null, last_error: r.lastError })))],
  );
}

export async function getPollState(db: Queryable, source: string): Promise<PollStateRow | null> {
  const { rows } = await db.query<Db>('select source, last_ok, last_error from poll_state where source = $1', [source]);
  const r = rows[0];
  return r ? fromDb(r) : null;
}

/** All sources, or only those starting with `prefix` (e.g. 'project:'). */
export async function listPollStates(db: Queryable, prefix = ''): Promise<PollStateRow[]> {
  const { rows } = await db.query<Db>(
    'select source, last_ok, last_error from poll_state where starts_with(source, $1) order by source',
    [prefix],
  );
  return rows.map(fromDb);
}

/**
 * ageSec: seconds since the last good poll (null = never polled). ok: false after a failed poll, true after a good
 * one, null when nothing was ever recorded.
 */
export function feedStatusOf(state: PollStateRow | null, now: Date): FeedStatus {
  if (!state) return { ageSec: null, ok: null };
  const ageSec = state.lastOk ? Math.max(0, Math.floor((now.getTime() - state.lastOk.getTime()) / 1000)) : null;
  if (state.lastError !== null) return { ageSec, ok: false, error: state.lastError };
  return { ageSec, ok: state.lastOk ? true : null };
}

/** Sources whose last good poll is older than `maxAgeSec`, or that never had one, or whose last poll failed. */
export async function staleSources(db: Queryable, now: Date, maxAgeSec: number, prefix = ''): Promise<string[]> {
  const states = await listPollStates(db, prefix);
  return states
    .filter((s) => {
      const f = feedStatusOf(s, now);
      return f.ok === false || f.ageSec === null || f.ageSec > maxAgeSec;
    })
    .map((s) => s.source);
}
