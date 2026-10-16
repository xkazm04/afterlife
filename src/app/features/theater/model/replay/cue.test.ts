// The address a screen opens on: `#seq=NNN` cues that entry, a seq the film does not hold is named, no address is none.
import { describe, expect, it } from 'vitest';
import type { Reel } from './state';
import { indexOfSeq } from './state';
import { cueOf } from './cue';

const film: Reel = {
  entries: [{ seq: 5, t: '' }, { seq: 3, t: '' }, { seq: 4, t: '' }],
  takes: [{ name: '!2', a: 5, b: 5 }, { name: '!1', a: 3, b: 4 }],
};

describe('cueOf', () => {
  it('a seq on the film cues its index', () => {
    expect(cueOf(film, '#seq=3')).toEqual({ i: indexOfSeq(3, film) });
    expect(cueOf(film, '?mr=1#seq=4')).toEqual({ i: 2 });
  });

  it('a seq not on the film is a miss, never take 1 in silence', () => {
    expect(cueOf(film, '#seq=999')).toEqual({ missingSeq: 999 });
  });

  it('no seq in the address is no cue', () => {
    expect(cueOf(film, '')).toBeNull();
    expect(cueOf(film, '?mr=44')).toBeNull();
  });
});
