import { describe, expect, it } from 'vitest';
import { recordPollError, recordPollOk } from '../repositories/pollState';
import { upsertProjects, type ProjectRow } from '../repositories/fleet/project';
import { upsertGroups } from '../repositories/fleet/taxonomy';
import { upsertProofs } from '../repositories/work/proof';
import { upsertTasks, type TaskRow } from '../repositories/work/task';
import { getEvents, MAX_EVENTS } from '../views/events';
import { memoryIndex } from './memoryIndex';

const project: ProjectRow = {
  id: 'ledgerline', gitlabId: 1, name: 'ledgerline', what: '', groupPath: 'core', state: 'watching', setupStep: null, ord: 0, armed: 0,
  proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null,
};
const at = (hhmm: string): Date => new Date(`2026-10-06T${hhmm}:00Z`);
const task = (id: string, over: Partial<TaskRow> = {}): TaskRow => ({
  id, projectId: 'ledgerline', track: 1, agent: 'ai-patcher', actionClass: 'dep-bump.patch', mrIid: null, title: `task ${id}`, tierAtTime: 'hands_off',
  state: 'started', stateLabel: null, startedAt: null, finishedAt: null, detail: {}, ...over,
});

async function index() {
  const db = await memoryIndex();
  await upsertGroups(db, ['core']);
  await upsertProjects(db, [project]);
  return db;
}

describe('the recent events, read from the index', () => {
  it('dates a task by its MR opening and merge, and puts its standing and proof verdict on its newest row', async () => {
    const db = await index();
    await upsertTasks(db, [
      task('A', { mrIid: 41, title: 'Fix path traversal', state: 'merged', stateLabel: 'merged · in production', startedAt: at('09:02'), finishedAt: at('09:29') }),
      task('B', { mrIid: 44, track: 4, title: 'Bump ktor-client', state: 'blocked', stateLabel: 'blocked', startedAt: at('14:10') }),
    ]);
    await upsertProofs(db, [{ taskId: 'A', class: 'exploit-test', verdict: 'pass', engineVersion: 'v1', engineSha256: 'x', checks: [], claims: [], block: null }]);
    await recordPollOk(db, 'project:ledgerline', new Date('2026-10-06T14:21:48Z'));
    expect(await getEvents(db, 'ledgerline')).toEqual([
      ['14:21', '—', 'polled · ok'],
      ['14:10', 'T4', '!44 opened · Bump ktor-client · blocked'],
      ['09:29', 'T1', '!41 merged · in production · proof PASS'],
      ['09:02', 'T1', '!41 opened · Fix path traversal'],
    ]);
  });

  it('invents no time: a task with none has no row, an unclassified task is not listed, a failed poll comes first undated', async () => {
    const db = await index();
    await upsertTasks(db, [task('SEEDED'), task('UNCLASSIFIED', { actionClass: null, startedAt: at('10:00') }), task('C', { track: null, startedAt: at('11:00') })]);
    await upsertProofs(db, [{ taskId: 'C', class: 'repro', verdict: null, engineVersion: null, engineSha256: null, checks: [], claims: [], block: null }]);
    await recordPollOk(db, 'project:ledgerline', at('12:00'));
    await recordPollError(db, 'project:ledgerline', '401 Unauthorized');
    expect(await getEvents(db, 'ledgerline')).toEqual([
      ['—', '—', 'poll failed · 401 Unauthorized'],
      ['12:00', '—', 'polled · ok'],
      ['11:00', 'T?', 'C opened · task C · started · proof UNKNOWN'], // no MR: the task id; no stored verdict: UNKNOWN, never a pass
    ]);
  });

  it('a project never polled and with no tasks has no events; a long history keeps the newest few', async () => {
    const db = await index();
    expect(await getEvents(db, 'ledgerline')).toEqual([]);
    await upsertTasks(db, Array.from({ length: 12 }, (_, i) => task(`T${i}`, { startedAt: new Date(Date.UTC(2026, 9, 6, 8 + i)) })));
    const events = await getEvents(db, 'ledgerline');
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events[0]?.[0]).toBe('19:00'); // the newest first
    expect(events.at(-1)?.[0]).toBe('10:00'); // 08:00 and 09:00 fall off
  });
});
