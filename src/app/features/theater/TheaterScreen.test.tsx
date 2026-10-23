// The screen's status bar says every address the film cannot honour: `?mr=` the ledger has no events for, and a
// `#seq=` the film does not hold. Both can miss at once; neither is played in silence as another run.
import { describe, expect, it } from 'vitest';
import { addressNotice } from './TheaterScreen';

describe('the status bar names every address the film cannot honour', () => {
  it('says nothing when both are honoured', () => {
    expect(addressNotice(undefined, null)).toBeNull();
  });
  it('names a missing MR, and a missing seq, each alone', () => {
    expect(addressNotice(99, null)).toBe('!99 has no events in the ledger: the newest runs play instead.');
    expect(addressNotice(undefined, 5)).toBe('seq 5 is not on this film: take 1 plays instead.');
  });
  it('names both when both miss, not only the MR', () => {
    const n = addressNotice(99, 5);
    expect(n).toContain('!99 has no events in the ledger');
    expect(n).toContain('seq 5 is not on this film');
  });
});
