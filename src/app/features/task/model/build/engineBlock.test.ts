// The engine's real V-204 Proof Block (engineBlock.pass.json) through the live path: poller validation, index row, Task
// view, then the screen's buildTasks. Run under fixture id 01J8Q4, the only id the Task view draws for a live task today.
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { proofRowFromBlock, upsertProofs } from '@/server/index/repositories/work/proof';
import { seedDemo } from '@/server/index/seed';
import { getTask } from '@/server/index/views/tasks';
import { parseProofBlock } from '@/server/poller/parse/proofBlock';
import { TASK_DETAIL, TASK_ORDER } from '../../data/details';
import { NO_FILTERS, statusLine, verdictCounts, visibleTasks } from '../docket/filters';
import { verdictWord } from '../verdict/equation';
import { buildTasks } from './buildTasks';
import pass from './engineBlock.pass.json';

const ID = '01J8Q4';

async function viewOf(raw: unknown) {
  const parsed = parseProofBlock(raw);
  if (!parsed.ok) throw new Error(parsed.reason);
  const db = await memoryIndex();
  await seedDemo(db);
  await upsertProofs(db, [proofRowFromBlock(ID, parsed.block)]);
  const row = await getTask(db, ID);
  if (!row) throw new Error('no task row');
  const [task] = buildTasks({
    tasks: [row as never], tracks: DEMO.tracks, actionClasses: DEMO.actionClasses, details: TASK_DETAIL, order: TASK_ORDER,
  }).filter((t) => t.id === ID);
  if (!task) throw new Error('task not built');
  return task;
}

describe('an engine Proof Block on the live path', () => {
  it('keeps every check id unique and ties each claim to the checks that name it', async () => {
    const t = await viewOf(pass);
    const ids = t.proof.checks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(pass.checks.map((c) => c.name));
    expect(t.claims.map((c) => [c.id, c.checks])).toEqual([
      ['c1', ['base-red', 'names-vector']],
      ['c2', ['head-green']],
      ['c3', ['test-not-weakened']],
      ['c4', ['finding-closed']],
    ]);
    expect(t.proof.verdict).toBe('PASS');
  });

  it('disambiguates a check name the block repeats', async () => {
    const twice = { ...pass, checks: [...pass.checks, { ...pass.checks[0]! }] };
    const ids = (await viewOf(twice)).proof.checks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.at(-1)).toBe('base-red#2');
  });

  it('carries an undetermined check and an inconclusive verdict faithfully, never as a pass', async () => {
    const block = { ...pass, verdict: 'inconclusive', checks: pass.checks.map((c, i) => (i === 5 ? { ...c, ok: null } : c)) };
    const t = await viewOf(block);
    expect(t.proof.verdict).toBe('INCONCLUSIVE');
    expect(verdictWord(t, null).word).toBe('INCONCLUSIVE');
    expect(t.proof.checks[5]?.ok).toBeNull();
    expect(verdictCounts([t])).toEqual({ all: 1, pass: 0, fail: 0 });
    expect(visibleTasks([t], { ...NO_FILTERS, verdict: 'PASS' })).toEqual([]);
    expect(statusLine([t], 1, 'now')).toContain('1 undetermined');
  });
});
