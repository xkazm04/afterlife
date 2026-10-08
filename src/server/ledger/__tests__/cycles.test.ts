import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_CYCLES } from '@/lib/demo';
import { appendCycle, hashCycle, verifyCycles, type CycleRecord } from '@/schemas/cycle';
import { createDemoGitLab, cycleRecords, LEDGERLINE_GID } from '@/server/gitlab/fake/demo';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { listCycleRecords } from '@/server/index/repositories/ledger/cycles';
import { SEED_NOW } from '@/server/index/seed/parse';
import { getCycles } from '@/server/index/views/cycles';
import { seedDemo } from '@/server/index/seed';
import { importCycles } from '../importCycles';
import type { LedgerSource } from '../importLedger';
import { LedgerParseError } from '../parse';
import { parseCyclesJsonl } from '../parseCycles';

const PATH = `cycles/${LEDGERLINE_GID}.jsonl`;
const jsonl = (rs: readonly CycleRecord[]): string => rs.map((r) => JSON.stringify(r)).join('\n') + '\n';
const body = ({ seq: _s, prev_hash: _p, hash: _h, ...rest }: CycleRecord) => (void [_s, _p, _h], rest);

let gl: FakeGitLab;
let db: PGlite;
let src: LedgerSource;
const setFile = (text: string): void => {
  const p = gl.state.projects.find((x) => x.raw.name === 'belay-ledger');
  if (!p) throw new Error('no ledger project');
  p.files[PATH] = text;
};

beforeEach(async () => {
  gl = createDemoGitLab(SEED_NOW);
  db = await memoryIndex();
  src = { port: gl.port, project: 'acme-lab/belay-ledger', ref: 'main' };
});

describe('the cycle record chain', () => {
  const chain = cycleRecords(SEED_NOW);
  it('the demo file verifies: six cycles, a week each, the last closed by the 14:02 scan', () => {
    expect(verifyCycles(chain)).toBeNull();
    expect(chain.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chain.at(-1)?.closed_at).toBe('2026-10-06T14:02:00.000Z');
  });
  it('an edited change, a dropped cycle or time running backwards breaks it at that cycle', () => {
    const edited = chain.map((r) => (r.seq === 4 ? { ...r, changes: r.changes.map((c) => ({ ...c, verdict: 'credited' as const })) } : r));
    expect(verifyCycles(edited)).toBe(4);
    expect(verifyCycles(chain.filter((r) => r.seq !== 2))).toBe(3);
    const early = { ...body(chain[0]!), opened_at: '2026-08-25T14:02:00.000Z', closed_at: '2026-08-20T14:02:00.000Z', seq: 1, prev_hash: chain[0]!.prev_hash };
    expect(verifyCycles([{ ...early, hash: hashCycle(early) }])).toBe(1);
  });
  it('the parser refuses an unknown verdict, a running verdict, an mr without an iid and a bad rung, by line', () => {
    const line = (over: Record<string, unknown>) => JSON.stringify({ ...chain[0], changes: [{ ...chain[0]!.changes[0], ...over }] });
    expect(() => parseCyclesJsonl(line({ verdict: 'pending' }))).toThrow(LedgerParseError);
    expect(() => parseCyclesJsonl(line({ mr_iid: null }))).toThrow(/an mr change has an iid/);
    expect(() => parseCyclesJsonl(line({ to: 5 }))).toThrow(/rungs 0..4/);
    expect(() => parseCyclesJsonl(`\n${line({ stage: 'deploy' })}`)).toThrow(/ledger line 2/);
  });
});

describe('cycles import', () => {
  it('imports the file whole; an unchanged file is skipped by its blob id', async () => {
    const cache = new Map<number, string>();
    expect(await importCycles(src, db, LEDGERLINE_GID, cache)).toEqual({ status: 'imported', cycles: 6 });
    expect(await importCycles(src, db, LEDGERLINE_GID, cache)).toEqual({ status: 'unchanged', cycles: 6 });
    expect(await listCycleRecords(db, LEDGERLINE_GID)).toEqual(cycleRecords(SEED_NOW));
  });

  it('takes a seventh cycle that extends the chain', async () => {
    await importCycles(src, db, LEDGERLINE_GID);
    const chain = cycleRecords(SEED_NOW);
    const next = appendCycle(chain, { ...body(chain[5]!), theme: 'Next', opened_at: chain[5]!.closed_at, closed_at: '2026-10-13T14:02:00.000Z', changes: [] });
    setFile(jsonl([...chain, next]));
    expect(await importCycles(src, db, LEDGERLINE_GID)).toEqual({ status: 'imported', cycles: 7 });
  });

  it('rejects a shortened, a rewritten and a foreign history, and keeps what it had', async () => {
    await importCycles(src, db, LEDGERLINE_GID);
    const chain = cycleRecords(SEED_NOW);
    setFile(jsonl(chain.slice(0, 4)));
    await expect(importCycles(src, db, LEDGERLINE_GID)).rejects.toThrow(/rewound/);

    const rewritten: CycleRecord[] = [];
    for (const r of chain) rewritten.push(appendCycle(rewritten, { ...body(r), theme: r.seq === 2 ? 'A better story' : r.theme }));
    setFile(jsonl(rewritten));
    await expect(importCycles(src, db, LEDGERLINE_GID)).rejects.toThrow(/cycle 2 differs/);

    const theirs: CycleRecord[] = [];
    for (const r of chain) theirs.push(appendCycle(theirs, { ...body(r), project_id: 1 }));
    setFile(jsonl(theirs));
    await expect(importCycles(src, db, LEDGERLINE_GID)).rejects.toThrow(/cycles of project 1/);
    expect((await listCycleRecords(db, LEDGERLINE_GID)).length).toBe(6);
  });

  it('no file is absent, and a project with no cycles has an empty history (not a made-up one)', async () => {
    const p = gl.state.projects.find((x) => x.raw.name === 'belay-ledger');
    delete p!.files[PATH];
    expect(await importCycles(src, db, LEDGERLINE_GID)).toEqual({ status: 'absent' });
    await seedDemo(db);
    expect(await getCycles(db, 'ledgerline', SEED_NOW)).toEqual({ cycles: [], today: 0, cadence: 7 });
  });
});

describe('the cycles view', () => {
  it('reads the stored chain back as the demo history, counted in days from the first opening', async () => {
    await seedDemo(db);
    await importCycles(src, db, LEDGERLINE_GID);
    await db.query('update project set gitlab_id = $1 where id = $2', [LEDGERLINE_GID, 'ledgerline']);
    expect(JSON.parse(JSON.stringify(await getCycles(db, 'ledgerline', SEED_NOW)))).toEqual(JSON.parse(JSON.stringify(DEMO_CYCLES)));
  });
});
