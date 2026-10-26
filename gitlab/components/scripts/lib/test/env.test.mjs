// envOf: AFTERLIFE_* is the name, BELAY_* still works, AFTERLIFE wins when both are set, and empty is unset.
import { describe, expect, it } from 'vitest';
import { envOf } from '../env.mjs';

describe('envOf', () => {
  it('reads AFTERLIFE_<key>, falls back to BELAY_<key>, and an empty value is unset', () => {
    expect(envOf({ AFTERLIFE_MODE: 'live' }, 'MODE')).toBe('live');
    expect(envOf({ BELAY_MODE: 'live' }, 'MODE')).toBe('live');
    expect(envOf({ AFTERLIFE_MODE: 'live', BELAY_MODE: 'demo' }, 'MODE')).toBe('live');
    expect(envOf({ AFTERLIFE_MODE: '', BELAY_MODE: '' }, 'MODE')).toBeUndefined();
  });
});
