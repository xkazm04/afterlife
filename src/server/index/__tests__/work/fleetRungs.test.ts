import { afterEach, describe, expect, it, vi } from 'vitest';
import { upsertGroups, upsertProjects } from '../../repositories';
import { memoryIndex } from '../memoryIndex';

afterEach(() => {
  vi.doUnmock('@/schemas/stages');
  vi.resetModules();
});

describe('a Fleet row with no stored rungs', () => {
  it('has one unknown rung per stage in STAGES, not a hand count', async () => {
    vi.resetModules();
    vi.doMock('@/schemas/stages', async (actual) => {
      const real = await actual<typeof import('@/schemas/stages')>();
      return { ...real, STAGES: [...real.STAGES, 'tenth'] };
    });
    const { getFleet } = await import('../../views/fleet');
    const db = await memoryIndex();
    await upsertGroups(db, ['core']);
    await upsertProjects(db, [{
      id: 'p', gitlabId: null, name: 'p', what: '', groupPath: 'core', state: 'watching', setupStep: null, ord: null, armed: 0, webUrl: null,
      proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null,
    }]);
    expect((await getFleet(db)).projects[0]?.stages).toEqual(Array.from({ length: 10 }, () => null));
  });
});
