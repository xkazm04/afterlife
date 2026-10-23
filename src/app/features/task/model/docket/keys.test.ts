import { describe, expect, it } from 'vitest';
import { TASK_KEYMAP, actionFor } from './keys';

const idle = { inDocket: false, inChrome: false, replaying: false };

describe('letter keys', () => {
  it('ignore case, so CapsLock and Shift do not disarm them', () => {
    expect(actionFor('R', idle)).toEqual({ type: 'replay' });
    expect(actionFor('W', idle)).toEqual({ type: 'words' });
    expect(actionFor('F', idle)).toEqual({ type: 'failOnly' });
  });
  it('every letter the keymap declares fires the same in upper case (derived from TASK_KEYMAP, not a hand list)', () => {
    const letters = TASK_KEYMAP.entries.flatMap((e) => e.keys.map((k) => k.key)).filter((k) => /^[a-z]$/.test(k));
    expect(letters.length).toBeGreaterThan(0);
    for (const k of letters) expect([k, actionFor(k.toUpperCase(), idle)]).toEqual([k, actionFor(k, idle)]);
  });
  it('leave other letters and named keys alone', () => {
    expect(actionFor('X', idle)).toBeNull();
    expect(actionFor('Escape', idle)).toEqual({ type: 'escape' });
  });
});
