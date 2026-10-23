import { describe, expect, it } from 'vitest';
import { engineHeld } from '@/app/features/task/components/engineHeld';
import { upsertGroups, upsertProjects, upsertProofs, upsertTasks } from '../../repositories';
import { getTask } from '../../views';
import { memoryIndex } from '../memoryIndex';

describe('the Task view of a proof the index holds no engine for', () => {
  it('reads as engine not held, the word the Task screen tests (never "unknown", which it would show as an engine)', async () => {
    const db = await memoryIndex();
    await upsertGroups(db, ['core']);
    await upsertProjects(db, [{
      id: 'p', gitlabId: null, name: 'p', what: '', groupPath: 'core', state: 'watching', setupStep: null, ord: null, armed: 0, webUrl: null,
      proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null,
    }]);
    await upsertTasks(db, [{
      id: 't', projectId: 'p', track: 2, agent: null, actionClass: 'deps.patch', mrIid: 7, title: 't', tierAtTime: null,
      state: 'proved', stateLabel: null, startedAt: null, finishedAt: null, detail: {},
    }]);
    await upsertProofs(db, [{ taskId: 't', class: 'deps.patch', verdict: null, engineVersion: null, engineSha256: null, checks: [], claims: [], block: null }]);
    const proof = (await getTask(db, 't'))?.proof;
    expect(proof && engineHeld(proof)).toBe(false);
    expect(proof?.digest).toBe('');
  });
});
