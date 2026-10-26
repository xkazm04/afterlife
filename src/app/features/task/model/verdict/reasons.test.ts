import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { proofRowFromBlock, upsertProofs } from '@/server/index/repositories/work/proof';
import { seedDemo } from '@/server/index/seed';
import { getTask } from '@/server/index/views/tasks';
import { parseProofBlock } from '@/server/poller/parse/proofBlock';
import { TASK_DETAIL, TASK_ORDER } from '../../data/details';
import pass from '../build/engineBlock.pass.json';
import { buildTasks } from '../build/buildTasks';
import { loadTasks } from '../build/loadTasks';
import type { TaskView } from '../types';
import { docketRow } from '../docket/row';
import { becauseLine, keepForeignKeys, nextReason, openingSelection, queryOf, selectionFromQuery, selectionHref, verdictReasons } from './reasons';

const tasks = loadTasks();
const get = (id: string): TaskView => {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};
const q4 = get('01J8Q4');
const q8 = get('01J8Q8');
/** verdict.test.ts's lie: 01J8Q4 still stores PASS, but its first check (base-red) now fails. */
const lie: TaskView = { ...q4, proof: { ...q4.proof, verdict: 'PASS', checks: q4.proof.checks.map((c, i) => (i === 0 ? { ...c, ok: false } : c)) } };

/** engineBlock.test.ts's inconclusive block: the engine's real block with check 5 undetermined, through the live path. */
async function inconclusive(): Promise<TaskView> {
  const parsed = parseProofBlock({ ...pass, verdict: 'inconclusive', checks: pass.checks.map((c, i) => (i === 5 ? { ...c, ok: null } : c)) });
  if (!parsed.ok) throw new Error(parsed.reason);
  const db = await memoryIndex();
  await seedDemo(db);
  await upsertProofs(db, [proofRowFromBlock('01J8Q4', parsed.block)]);
  const row = await getTask(db, '01J8Q4');
  const [task] = buildTasks({ tasks: [row as never], tracks: DEMO.tracks, actionClasses: DEMO.actionClasses, details: TASK_DETAIL, order: TASK_ORDER }).filter(
    (t) => t.id === '01J8Q4',
  );
  if (!task) throw new Error('task not built');
  return task;
}

describe('verdictReasons', () => {
  it('names the failing check, then the envelope breach, for the seeded FAIL', () => {
    expect(verdictReasons(q8)).toEqual([
      { check: 'envelope', alone: false },
      { envelope: 'breach', alone: false },
    ]);
    expect(openingSelection(q8)).toEqual({ side: 'check', id: 'envelope' });
    expect(becauseLine(q8)).toBe('FAIL because envelope · envelope breached');
  });

  it('names the check that broke a stored PASS, alone, and says what was stored', () => {
    expect(lie.proof.checks[0]?.id).toBe('base-red');
    expect(verdictReasons(lie)).toEqual([{ check: 'base-red', alone: true }]);
    expect(becauseLine(lie)).toBe('FAIL because base-red · stored PASS');
  });

  it('names the undetermined check of an INCONCLUSIVE, and never a struck term', async () => {
    const t = await inconclusive();
    const open = t.proof.checks[5]!.id;
    expect(verdictReasons(t)).toEqual([{ check: open, alone: true, undetermined: true }]);
    expect(openingSelection(t)).toEqual({ side: 'check', id: open });
    expect(verdictReasons(get('01J8QC'))).toEqual([]);
  });

  it('says why an INCONCLUSIVE with no engine check left is open, though no check is there to select', () => {
    const qa = get('01J8QA');
    const signed = { ...qa, proof: { ...qa.proof, checks: qa.proof.checks.map((c) => ({ ...c, decidedBy: 'human' as const })) } };
    expect([verdictReasons(signed), openingSelection(signed)]).toEqual([[], null]);
    expect(becauseLine(signed)).toBe('INCONCLUSIVE because no engine check · stored PASS');
  });

  it('GUARD: a PASS opens with nothing selected and has no because-line', () => {
    expect(openingSelection(q4)).toBeNull();
    expect(becauseLine(q4)).toBeNull();
  });
});

describe('selectionFromQuery', () => {
  it('opens on a valid id from the URL, else on the opening selection', () => {
    expect(selectionFromQuery(q8, { check: 'envelope' })).toEqual({ side: 'check', id: 'envelope' });
    expect(selectionFromQuery(q8, { check: 'nope' })).toEqual(openingSelection(q8));
    expect(selectionFromQuery(q8, { claim: 'c3' })).toEqual({ side: 'claim', id: 'c3' });
    expect(selectionFromQuery(q4, { claim: 'zz' })).toBeNull();
    expect(selectionFromQuery(q8, { check: ['bench', 'x'] })).toEqual({ side: 'check', id: 'bench' });
  });

  it('writes the selection back as the address', () => {
    expect(selectionHref('01J8Q8', { side: 'check', id: 'envelope' })).toBe('/task/01J8Q8?check=envelope');
    expect(selectionHref('01J8Q8', { side: 'claim', id: 'c 3' })).toBe('/task/01J8Q8?claim=c%203');
    expect(selectionHref('01J8Q4', null)).toBe('/task/01J8Q4');
  });

  it('encodes the task id as one path segment, as the docket and /task do', () => {
    expect(selectionHref('a/b?c#d e', null)).toBe('/task/a%2Fb%3Fc%23d%20e');
    expect(selectionHref('a/b', { side: 'check', id: 'x' })).toBe('/task/a%2Fb?check=x');
  });
});

describe('nextReason', () => {
  const envelope = { side: 'check', id: 'envelope' } as const;
  it('walks the reasons of the visible tasks and wraps', () => {
    const rows = tasks.map(docketRow);
    expect(nextReason(rows, q8, envelope)).toEqual({ id: '01J8Q8', sel: envelope });
    expect(nextReason(rows, q4, null)).toEqual({ id: '01J8Q8', sel: envelope });
    // the open task's own reasons come from the task itself (here the lie), not from its row
    expect(nextReason([docketRow(q4)], lie, null)).toEqual({ id: '01J8Q4', sel: { side: 'check', id: 'base-red' } });
    expect(nextReason([docketRow(q4)], q4, null)).toBeNull();
  });

  it('a task filtered out of the docket starts at the first visible row with a reason', () => {
    expect(nextReason([docketRow(q8)], q4, null)).toEqual({ id: '01J8Q8', sel: envelope });
  });
});

describe('queryOf', () => {
  it('reads the selection and tab keys off the URL, and nothing else', () => {
    expect(queryOf(new URLSearchParams('check=envelope&tab=ledger&xray=1'))).toEqual({ check: 'envelope', tab: 'ledger' });
    expect(queryOf(new URLSearchParams(''))).toEqual({});
    expect(selectionFromQuery(q8, queryOf(new URLSearchParams('claim=c3')))).toEqual({ side: 'claim', id: 'c3' });
  });
});

describe('keepForeignKeys', () => {
  it('keeps the X-ray flag and drops a stale selection of its own', () => {
    expect(keepForeignKeys('/task/a?check=c1', '?xray=1&claim=old')).toBe('/task/a?check=c1&xray=1');
    expect(keepForeignKeys('/task/a', '')).toBe('/task/a');
    expect(keepForeignKeys('/task/a', '?xray=1')).toBe('/task/a?xray=1');
  });
  it('owns the tab: a stale one is dropped, the address’s own is kept', () => {
    expect(keepForeignKeys('/task/a?check=c1', '?tab=ledger&xray=1')).toBe('/task/a?check=c1&xray=1');
    expect(keepForeignKeys('/task/a?check=c1&tab=chain', '?tab=ledger&xray=1')).toBe('/task/a?check=c1&tab=chain&xray=1');
  });
});
