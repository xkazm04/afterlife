// The run journal (action_runs, migration 0016): what each previewId's live confirm did, kept under that id. A confirm
// claims the id before its first command and finishes it with the response it sent, so a confirm that got no answer can
// be asked about (`recallRun`), and a repeat or a concurrent confirm of one previewId never runs the commands twice.
// Recall: ran (the response, done or failed), running (in this process, now), never (no confirm claimed it), or unknown
// (a confirm ended with no answer, or a process died mid-send: the commands may or may not have run).
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { asDate, type Queryable } from '@/server/index/repositories/sql';
import type { ActionResponse } from '../types';

export type Recall =
  | { kind: 'ran'; response: ActionResponse; at: string }
  | { kind: 'running'; since: string }
  | { kind: 'never' }
  | { kind: 'unknown' };

/** This process. A row still running under another boot was left by a process that is gone. */
export const BOOT: string = randomUUID();

/** How long a done confirm answers a repeat of its previewId from the record; after that the same plan may run again. */
export const RECALL_MS = 15 * 60_000;

/** The refusal a confirm gets while the same previewId is being sent by another one. */
export const STILL_RUNNING_REASON = 'this write is still running from an earlier click; ask again in a moment for its answer';

const PREVIEW_ID = /^[0-9a-f]{64}$/;

/**
 * Claims `previewId` for one confirm, atomically: true only when no confirm holds it. A failed or cut run may run again,
 * as may one an earlier process left running, and a done one older than RECALL_MS. `boot`: this process (tests name another).
 */
export async function claim(db: Queryable, previewId: string, now: Date, boot = BOOT): Promise<boolean> {
  const { rows } = await db.query(
    `insert into action_runs (preview_id, state, boot, since) values ($1, 'running', $2, $3::timestamptz)
     on conflict (preview_id) do update set state = 'running', boot = excluded.boot, since = excluded.since, finished_at = null, response = null
     where action_runs.state in ('failed', 'cut') or (action_runs.state = 'running' and action_runs.boot <> excluded.boot)
        or (action_runs.state = 'done' and action_runs.finished_at < $4::timestamptz)
     returning preview_id`,
    [previewId, boot, now.toISOString(), new Date(now.getTime() - RECALL_MS).toISOString()],
  );
  return rows.length === 1;
}

/** The confirm answered: done or failed keep the response; anything else ended it with no answer (cut). */
export async function finish(db: Queryable, previewId: string, response: ActionResponse | null, now: Date): Promise<void> {
  const kept = response && (response.status === 'done' || response.status === 'failed') ? response : null;
  await db.query(
    `update action_runs set state = $2, response = $3::jsonb, finished_at = $4::timestamptz where preview_id = $1 and state = 'running'`,
    [previewId, kept ? kept.status : 'cut', kept ? JSON.stringify(kept) : null, now.toISOString()],
  );
}

interface Row { state: 'running' | 'done' | 'failed' | 'cut'; boot: string; since: Date; finished_at: Date | null; response: ActionResponse | null }

/** What the record says `previewId` did. */
export async function recall(db: Queryable, previewId: string, boot = BOOT): Promise<Recall> {
  const { rows } = await db.query<Row>('select state, boot, since, finished_at, response from action_runs where preview_id = $1', [previewId]);
  const r = rows[0];
  if (!r) return { kind: 'never' };
  if ((r.state === 'done' || r.state === 'failed') && r.response) return { kind: 'ran', response: r.response, at: (asDate(r.finished_at) as Date).toISOString() };
  if (r.state === 'running' && r.boot === boot) return { kind: 'running', since: (asDate(r.since) as Date).toISOString() };
  return { kind: 'unknown' };
}

/**
 * What a confirm of `previewId` answers without planning or running anything: a done within RECALL_MS (the same response),
 * or a refusal while another confirm is sending it. Null: nothing recorded stops it from running.
 */
export async function answered(db: Queryable, previewId: string, now: Date): Promise<ActionResponse | null> {
  const r = await recall(db, previewId);
  if (r.kind === 'running') return { status: 'refused', reason: STILL_RUNNING_REASON };
  if (r.kind === 'ran' && r.response.status === 'done' && now.getTime() - Date.parse(r.at) <= RECALL_MS) return r.response;
  return null;
}

/** Did the confirm of `previewId` run? Demo mode never runs anything, and keeps no record: never. */
export async function recallRun(deps: { db: PGlite | null; mode: 'demo' | 'live' }, previewId: unknown): Promise<Recall> {
  if (deps.mode !== 'live' || !deps.db || typeof previewId !== 'string' || !PREVIEW_ID.test(previewId)) return { kind: 'never' };
  return recall(deps.db, previewId);
}
