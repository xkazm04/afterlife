import { afterEach, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { loadNeedsItem } from '../pick';

afterEach(() => setDataSource(null));

describe('loadNeedsItem (the data of /needs-you/[item])', () => {
  it('finds a decision of the desk by its id', () => {
    setDataSource(demoSource);
    for (const id of ['n1', 'n2', 'n4', 'n5']) expect(loadNeedsItem(id)).toMatchObject({ kind: 'desk', id });
  });

  it('finds a gap by its id', () => {
    setDataSource(demoSource);
    const v = loadNeedsItem('g1');
    expect(v?.id).toBe('g1');
    expect(v?.demo.gaps.some((g) => g.id === 'g1')).toBe(true);
  });

  it('is null for an unknown id, a group and a ledger row', () => {
    setDataSource(demoSource);
    for (const id of ['n3', 'zzz', 'g:kind', 'h0', 'g99']) expect(loadNeedsItem(id)).toBeNull();
  });
});
