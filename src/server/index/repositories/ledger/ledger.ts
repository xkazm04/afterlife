// The ledger index. Source of truth: belay-ledger/events/<project-id>.jsonl. Rows are only ever appended
// (a trigger refuses UPDATE and DELETE); a rebuild goes through resetLedger() and re-imports the file.
import type { PGlite } from '@electric-sql/pglite';
import { verifyChain, type LedgerEvent } from '@/schemas/ledger';
import type { Queryable } from '../sql';
import { assertExtends, LedgerChainError, type ChainTail } from './chain';

interface Db {
  seq: number; at: string; agent: string; action_class: string; kind: LedgerEvent['kind'];
  tier_at_time: LedgerEvent['tier_at_time']; subject: LedgerEvent['subject']; payload_ref: string;
  observed_by: LedgerEvent['observed_by']; prev_hash: string; hash: string;
}

const COLS = 'seq, at, agent, action_class, kind, tier_at_time, subject, payload_ref, observed_by, prev_hash, hash';

const fromDb = (r: Db): LedgerEvent => ({
  seq: r.seq, at: r.at, agent: r.agent, action_class: r.action_class, kind: r.kind, tier_at_time: r.tier_at_time,
  subject: r.subject, payload_ref: r.payload_ref, observed_by: r.observed_by, prev_hash: r.prev_hash, hash: r.hash,
});

export async function ledgerTail(db: Queryable, projectId: number): Promise<ChainTail | null> {
  const { rows } = await db.query<ChainTail>(
    'select seq, hash from ledger_event where project_id = $1 order by seq desc limit 1',
    [projectId],
  );
  return rows[0] ?? null;
}

export async function readLedger(db: Queryable, projectId: number, fromSeq = 1): Promise<LedgerEvent[]> {
  const { rows } = await db.query<Db>(
    `select ${COLS} from ledger_event where project_id = $1 and seq >= $2 order by seq`,
    [projectId, fromSeq],
  );
  return rows.map(fromDb);
}

export interface AppendResult {
  appended: number;
  /** Events already stored with the same hash (a re-import of the same file). */
  skipped: number;
}

/**
 * Appends events of ONE project's chain. The whole call is a single transaction: every new event must extend
 * the stored tail with a consecutive seq, matching prev_hash and a recomputed hash, or nothing is written and a
 * LedgerChainError names the first bad seq. An event whose seq is already stored is skipped when its hash is
 * identical and rejected when it differs (a fork).
 */
export async function appendLedgerEvents(db: PGlite, events: readonly LedgerEvent[]): Promise<AppendResult> {
  const first = events[0];
  if (!first) return { appended: 0, skipped: 0 };
  const projectId = first.subject.project_id;
  const stray = events.find((e) => e.subject.project_id !== projectId);
  if (stray) throw new LedgerChainError(stray.seq, `event belongs to project ${stray.subject.project_id}, not ${projectId}`);

  return db.transaction(async (tx) => {
    const tail = await ledgerTail(tx, projectId);
    const stored = tail ? await readLedger(tx, projectId) : [];
    const known = new Map(stored.map((e) => [e.seq, e.hash]));
    const fresh: LedgerEvent[] = [];
    for (const e of events) {
      const have = known.get(e.seq);
      if (have === undefined) fresh.push(e);
      else if (have !== e.hash) throw new LedgerChainError(e.seq, 'differs from the event already stored at this seq');
    }
    assertExtends(tail, fresh);
    for (const e of fresh) {
      await tx.query(
        `insert into ledger_event (project_id, ${COLS}, at_ts)
         values ($1, $2, $3::text, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, ($3::text)::timestamptz)`,
        [projectId, e.seq, e.at, e.agent, e.action_class, e.kind, e.tier_at_time, JSON.stringify(e.subject),
          e.payload_ref, e.observed_by, e.prev_hash, e.hash],
      );
    }
    return { appended: fresh.length, skipped: events.length - fresh.length };
  });
}

/** Re-verifies a stored chain from genesis. Returns the seq of the first broken link, or null when it verifies. */
export async function verifyStoredChain(db: Queryable, projectId: number): Promise<number | null> {
  return verifyChain(await readLedger(db, projectId));
}

/** Deletes one project's chain so it can be re-imported from belay-ledger. The only way a ledger row is removed. */
export async function resetLedger(db: PGlite, projectId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.exec('alter table ledger_event disable trigger ledger_event_no_change');
    await tx.query('delete from ledger_event where project_id = $1', [projectId]);
    await tx.exec('alter table ledger_event enable trigger ledger_event_no_change');
  });
}

/** Events of one action class, newest last (what a class record is recomputed from). */
export async function readClassEvents(db: Queryable, projectId: number, actionClass: string): Promise<LedgerEvent[]> {
  const { rows } = await db.query<Db>(
    `select ${COLS} from ledger_event where project_id = $1 and action_class = $2 order by seq`,
    [projectId, actionClass],
  );
  return rows.map(fromDb);
}
