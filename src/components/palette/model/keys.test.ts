import { describe, expect, it } from 'vitest';
import { paletteKey } from './keys';

describe('palette keys', () => {
  it('moves the highlight and stops at both ends', () => {
    expect(paletteKey('ArrowDown', 0, 3)).toEqual({ at: 1 });
    expect(paletteKey('ArrowDown', 2, 3)).toEqual({ at: 2 });
    expect(paletteKey('ArrowUp', 0, 3)).toEqual({ at: 0 });
  });
  it('never moves the highlight below row 0 when nothing matches', () => {
    expect(paletteKey('ArrowDown', 0, 0)).toEqual({ at: 0 });
  });
  it('keeps Tab in the field: the modal has no other stop', () => {
    expect(paletteKey('Tab', 0, 3)).toEqual({ stay: true });
  });
  it('goes on Enter and leaves typing and Escape to others', () => {
    expect(paletteKey('Enter', 1, 3)).toEqual({ go: true });
    expect(paletteKey('a', 1, 3)).toBeNull();
    expect(paletteKey('Escape', 1, 3)).toBeNull();
  });
});
