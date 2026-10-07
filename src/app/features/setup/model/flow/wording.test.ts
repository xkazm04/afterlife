import { describe, expect, it } from 'vitest';
import { getSetup } from '@/lib/demo';
import { createSetupState } from './state';
import { mrName, trackWhy } from './wording';

const s0 = createSetupState(getSetup(), 0);

describe('wording', () => {
  it('names an MR only as GitLab named it', () => {
    const t3 = s0.arm.T3!;
    expect(mrName({ ...t3, mr: '!22' })).toBe('!22');
    expect(mrName({ ...t3, mr: null })).toBe('the MR');
    expect(mrName({ ...t3, mr: null, simulated: true })).toBe('the simulated MR');
  });
  it('says why a track is locked, ready or armed', () => {
    expect(trackWhy(s0, s0.arm.T1!)).toBe('locked · needs T3 Governor, T6 Scanners');
    expect(trackWhy(s0, s0.arm.T5!)).toBe('locked · needs a runner (step 6)');
    expect(trackWhy(s0, s0.arm.T3!)).toBe('ready · 1 MR');
    expect(trackWhy(s0, s0.arm.T4!)).toBe('armed · revert disarms');
  });
});
