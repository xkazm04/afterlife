import { describe, expect, it } from 'vitest';
import { minWidth, px, range, repeatPx } from './columns';

describe('column helpers', () => {
  it('scales fixed tracks with the text-size variable', () => {
    expect(px(88)).toBe('calc(88px * var(--ui-scale))');
    expect(repeatPx(5, 88)).toBe('repeat(5, calc(88px * var(--ui-scale)))');
    expect(range(150, 240)).toBe('minmax(calc(150px * var(--ui-scale)), calc(240px * var(--ui-scale)))');
    expect(minWidth(872)).toBe(px(872));
  });
});
