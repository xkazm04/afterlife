import { afterAll, describe, expect, it } from 'vitest';
import { setDataSource } from '@/server/data';
import { loadLadderClass } from './loadLadderClass';

afterAll(() => setDataSource(null));

describe('loadLadderClass: /ladder/[class]', () => {
  it('a class on the Ladder loads with the screen data and its id', () => {
    const d = loadLadderClass('patch-bump');
    expect(d?.id).toBe('patch-bump');
    expect(d?.seed.classes.some((c) => c.id === 'patch-bump')).toBe(true);
    expect(d?.project).toBeTruthy();
  });

  it('a class the Ladder does not hold is null (the route calls notFound)', () => {
    expect(loadLadderClass('no-such.class')).toBeNull();
  });
});
