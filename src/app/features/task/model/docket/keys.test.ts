import { describe, expect, it } from 'vitest';
import { actionFor } from './keys';

const idle = { inDocket: false, inChrome: false, replaying: false };

describe('letter keys', () => {
  it('ignore case, so CapsLock and Shift do not disarm them', () => {
    expect(actionFor('R', idle)).toEqual({ type: 'replay' });
    expect(actionFor('W', idle)).toEqual({ type: 'words' });
    expect(actionFor('F', idle)).toEqual({ type: 'failOnly' });
  });
  it('leave other letters and named keys alone', () => {
    expect(actionFor('X', idle)).toBeNull();
    expect(actionFor('Escape', idle)).toEqual({ type: 'escape' });
  });
});
