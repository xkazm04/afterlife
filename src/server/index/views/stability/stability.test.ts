// The stability view: the agent MRs started in the last 7 days of each polled project, folded from their stored facts;
// a polled project with none is n 0, a project never polled has no entry.
import { describe, expect, it } from 'vitest';
import { upsertProjects, type ProjectRow } from '../../repositories/fleet/project';
import { upsertGroups } from '../../repositories/fleet/taxonomy';
import { upsertTasks, type TaskRow } from '../../repositories/work/task';
import { memoryIndex } from '../../__tests__/memoryIndex';
import { factOf, getStability } from './stability';

const project = (id: string, gitlabId: number | null): ProjectRow => ({
  id, gitlabId, name: id, what: '', groupPath: 'core', state: 'watching', setupStep: null, ord: null, armed: 0, webUrl: null,
  proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null,
});
const NOW = new Date('2026-10-06T14:22:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 3600 * 1000);
let n = 0;
const task = (over: Partial<TaskRow>): TaskRow => ({
  id: `T${(n += 1)}`, projectId: 'ledgerline', track: 1, agent: 'ai-patcher', actionClass: 'dep-bump.patch', mrIid: n, title: 't', tierAtTime: 'supervised',
  state: 'started', stateLabel: null, startedAt: daysAgo(1), finishedAt: null, detail: {}, ...over,
});

describe('getStability', () => {
  it('counts the window, takes the median size, the red rate over final pipelines and the reverts', async () => {
    const db = await memoryIndex();
    await upsertGroups(db, ['core']);
    await upsertProjects(db, [project('ledgerline', 1), project('quiet', 2), project('seeded', null)]);
    await upsertTasks(db, [
      task({ detail: { size: 10, pipeline: 'success' } }),
      task({ detail: { size: 40, pipeline: 'failed' }, state: 'reverted' }),
      task({ detail: { size: null, pipeline: 'running' } }),
      task({ detail: {} }), // indexed before mrFacts: unknown
      task({ detail: { size: 999, pipeline: 'failed' }, startedAt: daysAgo(8) }), // out of the window
      task({ detail: { size: 5, pipeline: 'failed' }, mrIid: null }), // no MR: not an agent MR
    ]);
    const s = await getStability(db, NOW);
    expect(s.ledgerline).toEqual({ n: 4, medianSize: 25, redRate: 0.5, failed: 1, finals: 2, reverts: 1 });
    expect(s.quiet).toEqual({ n: 0, medianSize: null, redRate: null, failed: 0, finals: 0, reverts: 0 });
    expect('seeded' in s).toBe(false);
  });
});

describe('factOf', () => {
  it('reads only known pipeline words and numeric sizes', () => {
    expect(factOf('merged', { size: 3, pipeline: 'canceled' })).toEqual({ size: 3, pipeline: 'canceled', reverted: false });
    expect(factOf('reverted', { pipeline: 'bogus' as never })).toEqual({ size: null, pipeline: null, reverted: true });
    expect(factOf(null, null)).toEqual({ size: null, pipeline: null, reverted: false });
  });
});
