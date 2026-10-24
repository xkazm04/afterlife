import { describe, expect, it } from 'vitest';
import { walkTo } from './walk';

describe('walking the cycles with the keyboard', () => {
  it('steps left and right, clamped at both ends', () => {
    expect([walkTo('ArrowLeft', 3, 8), walkTo('ArrowRight', 3, 8)]).toEqual([2, 4]);
    expect([walkTo('ArrowLeft', 0, 8), walkTo('ArrowRight', 7, 8)]).toEqual([0, 7]);
  });
  it('jumps to the first and the planned (last) cycle', () => {
    expect([walkTo('Home', 5, 8), walkTo('End', 1, 8)]).toEqual([0, 7]);
  });
  it('ignores a modified key, an empty history and any other key', () => {
    expect(walkTo('ArrowRight', 3, 8, true)).toBeNull();
    expect(walkTo('End', 0, 0)).toBeNull();
    expect(walkTo('a', 3, 8)).toBeNull();
  });
  it('never reads a key off the prototype ("toString", "constructor")', () => {
    expect([walkTo('toString', 3, 8), walkTo('constructor', 3, 8), walkTo('__proto__', 3, 8)]).toEqual([null, null, null]);
  });
});
