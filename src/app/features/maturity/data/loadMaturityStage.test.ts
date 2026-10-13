import { afterAll, describe, expect, it } from 'vitest';
import { setDataSource } from '@/server/data';
import { loadMaturityStage } from './loadMaturityStage';

afterAll(() => setDataSource(null));

describe('loadMaturityStage: /maturity/[stage]', () => {
  it('a stage the data source holds loads as that stage', () => {
    expect(loadMaturityStage('secure')).toBe('secure');
  });

  it('a name that is not a stage is null (the route calls notFound)', () => {
    expect(loadMaturityStage('no-such-stage')).toBeNull();
    expect(loadMaturityStage('')).toBeNull();
  });
});
