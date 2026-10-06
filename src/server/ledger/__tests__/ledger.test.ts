import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { append, GENESIS, type LedgerEvent } from '@/schemas/ledger';
import { createDemoGitLab, ledgerEvents, LEDGERLINE_GID } from '@/server/gitlab/fake/demo';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { readLedger, verifyStoredChain } from '@/server/index/repositories/ledger/ledger';
import { SEED_NOW } from '@/server/index/seed/parse';
import { importLedger, type LedgerSource } from '../importLedger';
import { LedgerParseError, parseLedgerJsonl } from '../parse';

const PATH = `events/${LEDGERLINE_GID}.jsonl`;
type Body = Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>;
const body = ({ seq: _s, prev_hash: _p, hash: _h, ...rest }: LedgerEvent): Body => (void [_s, _p, _h], rest);
const jsonl = (events: readonly LedgerEvent[]): string => events.map((e) => JSON.stringify(e)).join('\n') + '\n';

let gl: FakeGitLab;
let db: PGlite;
let src: LedgerSource;
const ledgerFiles = (): Record<string, string> => {
  const p = gl.state.projects.find((x) => x.raw.name === 'belay-ledger');
  if (!p) throw new Error('no ledger project');
  return p.files;
};

beforeEach(async () => {
  gl = createDemoGitLab(SEED_NOW);
  db = await memoryIndex();
  src = { port: gl.port, project: 'acme-lab/belay-ledger', ref: 'main' };
});

describe('ledger import', () => {
  it('imports the whole chain and the stored chain verifies', async () => {
    const r = await importLedger(src, db, LEDGERLINE_GID);
    expect(r).toEqual({ status: 'imported', appended: 7, tailSeq: 7 });
    expect(await verifyStoredChain(db, LEDGERLINE_GID)).toBeNull();
    expect((await readLedger(db, LEDGERLINE_GID)).map((e) => e.kind).at(-1)).toBe('tier_decision');
  });

  it('is incremental: a second import appends only the new events, an unchanged file is skipped by its blob id', async () => {
    const cache = new Map<number, string>();
    await importLedger(src, db, LEDGERLINE_GID, cache);
    expect(await importLedger(src, db, LEDGERLINE_GID, cache)).toEqual({ status: 'unchanged', tailSeq: 7 });

    const events = ledgerEvents(SEED_NOW);
    const more = append(events, { ...body(events[6]!), at: SEED_NOW.toISOString(), kind: 'outcome' });
    ledgerFiles()[PATH] = jsonl([...events, more]);
    expect(await importLedger(src, db, LEDGERLINE_GID, cache)).toEqual({ status: 'imported', appended: 1, tailSeq: 8 });
    expect((await readLedger(db, LEDGERLINE_GID)).length).toBe(8);
  });

  it('re-importing the same file without a cache is a no-op', async () => {
    await importLedger(src, db, LEDGERLINE_GID);
    expect(await importLedger(src, db, LEDGERLINE_GID)).toMatchObject({ status: 'imported', appended: 0 });
  });

  it('reports a project with no file as absent, not as an error', async () => {
    expect(await importLedger(src, db, 12345)).toEqual({ status: 'absent' });
  });
});

describe('ledger import rejects tampering and keeps what it had', () => {
  const tamper = async (edit: (events: LedgerEvent[]) => string): Promise<unknown> => {
    await importLedger(src, db, LEDGERLINE_GID);
    ledgerFiles()[PATH] = edit(ledgerEvents(SEED_NOW));
    return importLedger(src, db, LEDGERLINE_GID).catch((e: unknown) => e);
  };

  it('an edited event (hash no longer matches its content)', async () => {
    const e = await tamper((ev) => jsonl(ev.map((x) => (x.seq === 3 ? { ...x, agent: 'someone-else' } : x))));
    expect(e).toMatchObject({ name: 'LedgerChainError', brokenAtSeq: 3 });
    expect((await readLedger(db, LEDGERLINE_GID)).find((x) => x.seq === 3)?.agent).not.toBe('someone-else');
  });

  it('a rewritten history that still verifies (a fork) is refused', async () => {
    const e = await tamper((ev) => {
      const forked: LedgerEvent[] = [];
      for (const x of ev) forked.push(append(forked, { ...body(x), agent: x.seq === 2 ? 'forged' : x.agent }));
      return jsonl(forked);
    });
    // the forked file verifies on its own; it is caught where it meets the stored tail
    expect(e).toMatchObject({ name: 'LedgerChainError', brokenAtSeq: 7 });
    expect(await verifyStoredChain(db, LEDGERLINE_GID)).toBeNull();
  });

  it('a shortened file (rewound)', async () => {
    const e = await tamper((ev) => jsonl(ev.slice(0, 4)));
    expect(e).toMatchObject({ name: 'LedgerChainError' });
    expect((await readLedger(db, LEDGERLINE_GID)).length).toBe(7);
  });

  it('events of another project in the file', async () => {
    const e = await tamper((ev) => {
      const other: LedgerEvent[] = [];
      for (const x of ev) other.push(append(other, { ...body(x), subject: { ...x.subject, project_id: 7 } }));
      return jsonl(other);
    });
    expect(e).toMatchObject({ name: 'LedgerChainError' });
  });
});

describe('ledger parser', () => {
  const good = jsonl(ledgerEvents(SEED_NOW));

  it('reads every line and tolerates CRLF and a blank tail', () => {
    expect(parseLedgerJsonl(good.replaceAll('\n', '\r\n') + '\n\n')).toHaveLength(7);
  });

  it('names the line of the first bad one', () => {
    const lines = good.trim().split('\n');
    lines[2] = '{"seq":3}';
    expect(() => parseLedgerJsonl(lines.join('\n'))).toThrow(LedgerParseError);
    expect(() => parseLedgerJsonl(lines.join('\n'))).toThrow(/line 3/);
    expect(() => parseLedgerJsonl('not json')).toThrow(/line 1: not valid JSON/);
  });

  it('rejects an unknown kind, a bad hash and a bad time', () => {
    const e = ledgerEvents(SEED_NOW)[0]!;
    for (const bad of [{ ...e, kind: 'deleted' }, { ...e, hash: 'abc' }, { ...e, at: 'yesterday' }, { ...e, prev_hash: GENESIS.slice(1) }]) {
      expect(() => parseLedgerJsonl(JSON.stringify(bad))).toThrow(LedgerParseError);
    }
  });
});
