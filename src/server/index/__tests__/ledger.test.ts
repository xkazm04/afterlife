import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { append, GENESIS, type LedgerEvent } from '@/schemas/ledger';
import {
  appendLedgerEvents, ledgerTail, LedgerChainError, readClassEvents, readLedger, resetLedger, verifyStoredChain,
} from '../repositories';
import { memoryIndex } from './memoryIndex';

const PROJECT = 42;
type Draft = Parameters<typeof append>[1];

const draft = (n: number, project = PROJECT, cls = 'dep-bump.patch'): Draft => ({
  at: `2026-10-06T09:0${n}:00Z`, agent: 'ai-patcher-acme', action_class: cls, kind: 'task_started', tier_at_time: 'supervised',
  subject: { project_id: project, type: 'mr', iid: 40 + n }, payload_ref: `events/${n}.json`, observed_by: 'poll',
});

function chain(length: number, project = PROJECT): LedgerEvent[] {
  const out: LedgerEvent[] = [];
  for (let i = 1; i <= length; i++) out.push(append(out, draft(i, project)));
  return out;
}

async function rejected(promise: Promise<unknown>): Promise<LedgerChainError> {
  const err = await promise.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(LedgerChainError);
  return err as LedgerChainError;
}

describe('appendLedgerEvents', () => {
  let db: PGlite;
  beforeEach(async () => { db = await memoryIndex(); });

  it('accepts a chain from genesis and reads it back byte for byte', async () => {
    const events = chain(3);
    expect(await appendLedgerEvents(db, events)).toEqual({ appended: 3, skipped: 0 });
    expect(await readLedger(db, PROJECT)).toEqual(events);
    expect(await ledgerTail(db, PROJECT)).toEqual({ seq: 3, hash: events[2]?.hash });
    expect(events[0]?.prev_hash).toBe(GENESIS);
    expect(await verifyStoredChain(db, PROJECT)).toBeNull();
  });

  it('extends a stored chain and skips events it already holds', async () => {
    const events = chain(5);
    await appendLedgerEvents(db, events.slice(0, 2));
    expect(await appendLedgerEvents(db, events)).toEqual({ appended: 3, skipped: 2 });
    expect(await appendLedgerEvents(db, events)).toEqual({ appended: 0, skipped: 5 });
    expect(await readLedger(db, PROJECT)).toHaveLength(5);
  });

  it('keeps one chain per project', async () => {
    await appendLedgerEvents(db, chain(2));
    await appendLedgerEvents(db, chain(1, 7));
    expect(await readLedger(db, 7)).toHaveLength(1);
    expect(await readLedger(db, PROJECT)).toHaveLength(2);
  });

  it('rejects a tampered event and writes nothing', async () => {
    const events = chain(3);
    const bad = events.map((e, i) => (i === 1 ? { ...e, agent: 'someone-else' } : e));
    const err = await rejected(appendLedgerEvents(db, bad));
    expect(err.brokenAtSeq).toBe(2);
    expect(await readLedger(db, PROJECT)).toEqual([]);
  });

  it('rejects a wrong prev_hash, a gap in seq, and a chain that does not start at genesis', async () => {
    const events = chain(4);
    const e2 = events[1] as LedgerEvent;
    const e3 = events[2] as LedgerEvent;
    expect((await rejected(appendLedgerEvents(db, [events[0] as LedgerEvent, { ...e2, prev_hash: GENESIS }]))).brokenAtSeq).toBe(2);
    expect((await rejected(appendLedgerEvents(db, [events[0] as LedgerEvent, e3]))).brokenAtSeq).toBe(3);
    expect((await rejected(appendLedgerEvents(db, [e2]))).brokenAtSeq).toBe(2);
    expect(await readLedger(db, PROJECT)).toEqual([]);
  });

  it('rejects a fork: a different event at a seq that is already stored', async () => {
    const events = chain(2);
    await appendLedgerEvents(db, events);
    const fork = append(events.slice(0, 1), { ...draft(2), payload_ref: 'events/other.json' });
    expect((await rejected(appendLedgerEvents(db, [events[0] as LedgerEvent, fork]))).brokenAtSeq).toBe(2);
    expect(await readLedger(db, PROJECT)).toEqual(events);
  });

  it('rejects a batch that mixes projects', async () => {
    const mixed = [...chain(1), ...chain(2, 7).slice(1)];
    await rejected(appendLedgerEvents(db, mixed));
  });

  it('does nothing for an empty batch', async () => {
    expect(await appendLedgerEvents(db, [])).toEqual({ appended: 0, skipped: 0 });
  });

  it('selects the events of one class', async () => {
    const events: LedgerEvent[] = [];
    events.push(append(events, draft(1, PROJECT, 'dep-bump.patch')));
    events.push(append(events, draft(2, PROJECT, 'guard.block')));
    events.push(append(events, draft(3, PROJECT, 'dep-bump.patch')));
    await appendLedgerEvents(db, events);
    expect((await readClassEvents(db, PROJECT, 'dep-bump.patch')).map((e) => e.seq)).toEqual([1, 3]);
  });
});

describe('stored chain integrity', () => {
  it('refuses updates and deletes, and reports a tampered row when the guard is bypassed', async () => {
    const db = await memoryIndex();
    await appendLedgerEvents(db, chain(3));
    await expect(db.query(`update ledger_event set agent = 'x' where seq = 2`)).rejects.toThrow(/append-only/);
    await expect(db.query('delete from ledger_event')).rejects.toThrow(/append-only/);

    await db.exec('alter table ledger_event disable trigger ledger_event_no_change');
    await db.query(`update ledger_event set agent = 'x' where seq = 2`);
    await db.exec('alter table ledger_event enable trigger ledger_event_no_change');
    expect(await verifyStoredChain(db, PROJECT)).toBe(2);
  });

  it('can be reset for a re-import from belay-ledger, and the guard stays on', async () => {
    const db = await memoryIndex();
    const events = chain(3);
    await appendLedgerEvents(db, events);
    await resetLedger(db, PROJECT);
    expect(await readLedger(db, PROJECT)).toEqual([]);
    await appendLedgerEvents(db, events);
    expect(await verifyStoredChain(db, PROJECT)).toBeNull();
    await expect(db.query('delete from ledger_event')).rejects.toThrow(/append-only/);
  });
});
