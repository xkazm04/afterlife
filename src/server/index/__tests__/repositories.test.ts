import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ProofBlock } from '@/schemas/proof';
import {
  closeProposal, finishCommand, getPairing, getProjectRow, getTaskRow, listClassTiers, listCommands, listGroups,
  listOpenProposals, listProjects, listProjectStages, listProofsFor, listSetupSteps, listTrustClasses, latestStageCells,
  proofRowFromBlock, recordCommand, upsertClassTiers, upsertGroups, upsertPairing, upsertProjects, upsertProofs,
  upsertProposals, upsertSetupSteps, upsertStageCells, upsertTasks, upsertTrustClasses, setProjectStages,
  type ProjectRow,
} from '../repositories';
import { memoryIndex } from './memoryIndex';

const project = (id: string, over: Partial<ProjectRow> = {}): ProjectRow => ({
  id, gitlabId: null, name: id, what: '', groupPath: 'core', state: 'watching', setupStep: null, ord: null, armed: 0,
  proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null, ...over,
});

const NOW = new Date('2026-10-06T14:22:00Z');
let db: PGlite;
beforeAll(async () => {
  db = await memoryIndex();
  await upsertGroups(db, ['core', 'edge']);
});

describe('fleet repositories', () => {
  it('upsert projects: insert, then update in place; unknown stays null', async () => {
    await upsertProjects(db, [project('a', { ord: 1 }), project('b', { ord: 0, proofs7d: { pass: 3, fail: 0, inconclusive: 1 } })]);
    await upsertProjects(db, [project('a', { ord: 1, armed: 7, last: { at: NOW, track: 'T4', text: 'blocked !44' } })]);
    const rows = await listProjects(db);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
    const a = rows.find((r) => r.id === 'a');
    expect(a?.armed).toBe(7);
    expect(a?.proofs7d).toBeNull();
    expect(a?.demotions7d).toBeNull();
    expect(a?.last).toEqual({ at: NOW, track: 'T4', text: 'blocked !44' });
    expect((await getProjectRow(db, 'b'))?.proofs7d).toEqual({ pass: 3, fail: 0, inconclusive: 1 });
    expect(await getProjectRow(db, 'nope')).toBeNull();
  });

  it('refuse half-known proof counts and projects in a group that does not exist', async () => {
    await expect(db.query(`insert into project (id, name, group_path, state, proofs_pass_7d) values ('x', 'x', 'core', 'watching', 1)`)).rejects.toThrow();
    await expect(upsertProjects(db, [project('y', { groupPath: 'nowhere' })])).rejects.toThrow();
  });

  it('keep groups and classes in display order', async () => {
    expect(await listGroups(db)).toEqual(['core', 'edge']);
    await upsertTrustClasses(db, [
      { id: 'b.class', ord: 1, track: 2, agent: null, ceiling: 'supervised' },
      { id: 'a.class', ord: 0, track: 1, agent: 'ai-patcher', ceiling: 'hands_off' },
    ]);
    expect((await listTrustClasses(db)).map((c) => c.id)).toEqual(['a.class', 'b.class']);
  });

  it('upsert class tiers with and without a record', async () => {
    await upsertClassTiers(db, [
      { projectId: 'a', classId: 'a.class', tier: 'hands_off', since: null, setBy: null, leaseExpires: NOW,
        record: { accepted: 16, needed: 15, noEdit: 0.94, cleanDays: 14, reverts: 0 }, move: { kind: 'promoted', at: NOW, note: null } },
      { projectId: 'a', classId: 'b.class', tier: null, since: null, setBy: null, leaseExpires: null, record: null, move: null },
    ]);
    const rows = await listClassTiers(db, 'a');
    expect(rows[0]).toMatchObject({ classId: 'a.class', tier: 'hands_off', leaseExpires: NOW, record: { noEdit: 0.94 } });
    expect(rows[1]).toMatchObject({ classId: 'b.class', tier: null, record: null, move: null });
    expect(await listClassTiers(db, 'b')).toEqual([]);
    await expect(upsertClassTiers(db, [{ projectId: 'a', classId: 'ghost', tier: null, since: null, setBy: null, leaseExpires: null, record: null, move: null }])).rejects.toThrow();
  });

  it('store the nine rungs in stage order, null = unknown', async () => {
    await setProjectStages(db, new Map([['a', [1, 2, null, 0, 4, 3, 2, 1, 0]]]));
    expect((await listProjectStages(db)).get('a')).toEqual([1, 2, null, 0, 4, 3, 2, 1, 0]);
    await expect(setProjectStages(db, new Map([['a', [5]]]))).rejects.toThrow();
  });
});

describe('work repositories', () => {
  it('upsert tasks and proofs, including a proof built from a Proof Block', async () => {
    await upsertTasks(db, [{
      id: 'T1', projectId: 'a', track: 1, agent: 'ai-patcher', actionClass: 'a.class', mrIid: 41, title: 'Fix', tierAtTime: 'supervised',
      state: 'merged', stateLabel: 'merged · in production', startedAt: NOW, finishedAt: null, detail: { agentWords: 'ok' },
    }]);
    const block: ProofBlock = {
      schema: 'belay.proof/1', id: '01J', class: 'exploit-test', task: { flow: 'f', run_id: '1', project_id: 42, trailer: 't' },
      claims: [{ id: 'c1', text: 'fixed CWE-22' }],
      checks: [{ claim_id: 'c1', name: 'base red', ok: true, detail: 'd', ref: 'job #1' }, { claim_id: null, name: 'rescan', ok: null, detail: '' }],
      evidence: [], verdict: 'inconclusive', envelope: { files: 1, lines: 2, paths_touched: [], within: true },
      engine: { version: '1', sha256: 'abc' },
    };
    await upsertProofs(db, [proofRowFromBlock('T1', block)]);
    const proof = (await listProofsFor(db, ['T1'])).get('T1');
    expect(proof).toMatchObject({ verdict: 'inconclusive', engineSha256: 'abc', claims: ['fixed CWE-22'], block });
    expect(proof?.checks.map((c) => [c.id, c.claim, c.ok])).toEqual([['base red', 'c1', true], ['rescan', null, null]]);
    expect((await getTaskRow(db, 'T1'))?.startedAt).toEqual(NOW);
    expect((await listProofsFor(db, [])).size).toBe(0);
  });

  it('close a proposal once, and only while it is open', async () => {
    await upsertProposals(db, [
      { id: 'p1', projectId: 'a', kind: 'promotion', state: 'open', parentId: null, title: 'Promote', subject: { does: 'x' }, dueAt: null, openedAt: NOW, actedAt: null, actedAs: null },
      { id: 'g1', projectId: 'a', kind: 'gap', state: 'open', parentId: 'p1', title: 'Gap', subject: {}, dueAt: null, openedAt: NOW, actedAt: null, actedAs: null },
    ]);
    expect((await listOpenProposals(db, 'a')).map((p) => p.id)).toEqual(['p1']);
    expect((await listOpenProposals(db, 'a', true)).map((p) => p.id)).toEqual(['g1']);
    expect(await closeProposal(db, 'p1', 'acted', NOW, 'operator')).toBe(true);
    expect(await closeProposal(db, 'p1', 'dismissed', NOW, 'operator')).toBe(false);
    expect(await listOpenProposals(db, 'a')).toEqual([]);
  });

  it('keep every scan and read only the latest', async () => {
    const cell = (day: string, rung: number | null) => ({
      projectId: 'a', stage: 'plan' as const, rung, baseRung: 0, nextRung: 2, evidence: [{ label: 'MR !1', url: 'https://gitlab/x' }],
      evidenceNote: null, engineVersion: 'v1', scannedAt: new Date(`2026-10-${day}T10:00:00Z`),
    });
    await upsertStageCells(db, [cell('01', 1), cell('02', null)]);
    const latest = await latestStageCells(db, 'a');
    expect(latest).toHaveLength(1);
    expect(latest[0]?.rung).toBeNull();
    expect(await latestStageCells(db, 'b')).toEqual([]);
  });
});

describe('operator repositories', () => {
  it('record a command before it runs and finish it once', async () => {
    const id = await recordCommand(db, { at: NOW, operator: 'me', projectId: 'a', display: 'glab mr merge 12', argv: ['glab', 'mr', 'merge', '12'], risk: 'write' });
    expect((await listCommands(db, 'a'))[0]).toMatchObject({ id, outcome: 'confirmed', exitCode: null, argv: ['glab', 'mr', 'merge', '12'] });
    expect(await finishCommand(db, id, 0, NOW)).toBe(true);
    expect(await finishCommand(db, id, 1, NOW)).toBe(false);
    expect((await listCommands(db))[0]).toMatchObject({ outcome: 'ok', exitCode: 0 });
  });

  it('store the pairing and what each setup step measured', async () => {
    await upsertPairing(db, { id: 'p', gitlabHost: 'gitlab.com', groupPath: 'acme-lab', checkoutPath: null, pairedAt: NOW });
    await upsertSetupSteps(db, [
      { pairingId: 'p', step: 1, who: 'agent', state: 'done', probe: { ok: true }, probedAt: NOW },
      { pairingId: 'p', step: 0, who: 'human', state: 'unknown', probe: null, probedAt: null },
    ]);
    expect((await getPairing(db, 'p'))?.checkoutPath).toBeNull();
    expect((await listSetupSteps(db, 'p')).map((s) => [s.step, s.state])).toEqual([[0, 'unknown'], [1, 'done']]);
    await expect(upsertSetupSteps(db, [{ pairingId: 'p', step: 15, who: 'agent', state: 'done', probe: null, probedAt: null }])).rejects.toThrow();
  });
});
