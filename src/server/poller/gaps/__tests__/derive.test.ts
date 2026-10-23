// A live gap proposal per stage the engine's propose() names for the newest scan: opened once, refreshed in place, never
// reopened once a person settled it, and expired when the stage reaches the rung it asked for.
import { describe, expect, it } from 'vitest';
import type { ScanCell } from '@/schemas/maturity';
import { STAGES, type Stage } from '@/schemas/stages';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { closeProposal, listProposalsOfKind, type ProposalRow } from '@/server/index/repositories/work/proposal';
import { planGaps } from '../derive';
import { templateFor } from '../templates';
import { writeGaps } from '../write';

const T0 = new Date('2026-10-20T10:00:00.000Z');
const T1 = new Date('2026-10-21T10:00:00.000Z');
/** Every stage at R2 except the ones given. */
const cells = (rungs: Partial<Record<Stage, number | null>> = {}): ScanCell[] =>
  STAGES.map((stage) => {
    const rung = stage in rungs ? (rungs[stage] ?? null) : 2;
    return { stage, rung, evidence: rung ? [{ label: 'job #7', url: 'https://gitlab.example/g/p/-/jobs/7' }] : [], note: 'n', next_rung: rung === null ? null : rung + 1 };
  });

describe('templateFor', () => {
  it('names a template only for the three mechanical 0 -> 1 steps', () => {
    expect(templateFor('secure', 0, 1)).toBe('secure-includes');
    expect(templateFor('package', 0, 1)).toBe('package-build');
    expect(templateFor('plan', 0, 1)).toBe('plan-issue-templates');
    expect(templateFor('secure', null, 1)).toBeNull();
    expect(templateFor('secure', 1, 2)).toBeNull();
    expect(templateFor('verify', 0, 1)).toBeNull();
  });
});

describe('planGaps', () => {
  it('(1) a stage at R0 with a template opens one top-level gap:<p>:<stage>:1', () => {
    const plan = planGaps('p', cells({ secure: 0 }), [], T0);
    expect(plan.expire).toEqual([]);
    expect(plan.upsert).toHaveLength(1);
    expect(plan.upsert[0]).toMatchObject({
      id: 'gap:p:secure:1', projectId: 'p', kind: 'gap', state: 'open', parentId: null, dueAt: null, openedAt: T0,
      subject: { stage: 'secure', rungFrom: 0, rungTo: 1, template: 'secure-includes' },
    });
    expect(plan.upsert[0]?.title).toMatch(/^secure R0 → R1: include Jobs\/SAST\.gitlab-ci\.yml$/);
    expect(String(plan.upsert[0]?.subject.change)).toMatch(/Secret-Detection/);
  });

  it('an unknown rung is a gap from null, with no template; a stage at R1 or above is none', () => {
    const plan = planGaps('p', cells({ verify: null }), [], T0);
    expect(plan.upsert.map((p) => [p.id, p.subject.rungFrom, p.subject.template])).toEqual([['gap:p:verify:1', null, null]]);
    expect(plan.upsert[0]?.title).toMatch(/^verify R\? → R1: /);
    expect(planGaps('p', cells(), [], T0).upsert).toEqual([]);
  });

  it('(2) a re-poll refreshes an open gap with its openedAt kept, and skips a settled one', () => {
    const [open] = planGaps('p', cells({ secure: 0 }), [], T0).upsert;
    const again = planGaps('p', cells({ secure: 0 }), [open as ProposalRow], T1);
    expect(again.upsert.map((p) => [p.id, p.openedAt])).toEqual([['gap:p:secure:1', T0]]);
    for (const state of ['acted', 'dismissed', 'expired'] as const) {
      expect(planGaps('p', cells({ secure: 0 }), [{ ...(open as ProposalRow), state }], T1).upsert).toEqual([]);
    }
  });

  it('(3) a rung rising to the asked rung expires the open gap; only this project\'s gap: ids are touched', () => {
    const [open] = planGaps('p', cells({ secure: 0 }), [], T0).upsert;
    const seeded: ProposalRow = { ...(open as ProposalRow), id: 'n3', subject: { stage: 'secure', rungTo: 1 } };
    const other: ProposalRow = { ...(open as ProposalRow), id: 'gap:q:secure:1' };
    expect(planGaps('p', cells({ secure: 1 }), [open as ProposalRow, seeded, other], T1)).toEqual({ upsert: [], expire: ['gap:p:secure:1'] });
    expect(planGaps('p', cells({ secure: null }), [open as ProposalRow], T1).expire).toEqual([]);
  });
});

describe('writeGaps, in the index', () => {
  async function index() {
    const db = await memoryIndex();
    await db.exec(`insert into fleet_group (path, ord) values ('g', 0)`);
    await db.exec(`insert into project (id, name, group_path, state) values ('p', 'p', 'g', 'watching')`);
    return db;
  }
  const rows = async (db: Awaited<ReturnType<typeof index>>) =>
    (await listProposalsOfKind(db, 'p', 'gap')).map((p) => [p.id, p.state, p.openedAt.toISOString()]);

  it('writes one open row, does not duplicate it on a re-poll, and never reopens an acted one', async () => {
    const db = await index();
    await writeGaps(db, 'p', cells({ package: 0 }), T0);
    await writeGaps(db, 'p', cells({ package: 0 }), T1);
    expect(await rows(db)).toEqual([['gap:p:package:1', 'open', T0.toISOString()]]);
    expect(await closeProposal(db, 'gap:p:package:1', 'acted', T1, 'operator')).toBe(true);
    await writeGaps(db, 'p', cells({ package: 0 }), T1);
    expect(await rows(db)).toEqual([['gap:p:package:1', 'acted', T0.toISOString()]]);
  });

  it('expires the open row once the stage reaches its rung', async () => {
    const db = await index();
    await writeGaps(db, 'p', cells({ plan: 0 }), T0);
    await writeGaps(db, 'p', cells({ plan: 1 }), T1);
    const [row] = await listProposalsOfKind(db, 'p', 'gap');
    expect([row?.state, row?.actedAt, row?.actedAs]).toEqual(['expired', T1, null]);
  });
});
