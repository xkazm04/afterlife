import { describe, expect, it } from 'vitest';
import { specRows } from './specRows';

describe('specRows', () => {
  it('reproduces the D10 table', () => {
    const rows = specRows();
    expect(rows[0]?.values).toEqual({ smaller: '13 / 12 / 11 px', standard: '15 / 14 / 13 px', larger: '17 / 16 / 14 px' });
    expect(rows[1]?.values.standard).toBe('26 / 28 px');
    expect(rows[2]?.values.larger).toBe('60 / 28 px');
    expect(rows[3]?.values.smaller).toBe('200 px');
    expect(rows[4]?.values).toEqual({ smaller: '1x', standard: '1.15x', larger: '1.3x' });
  });
});
