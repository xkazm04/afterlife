import { describe, expect, it } from 'vitest';
import { getSetup, getTracks } from '@/lib/demo';
import { createSetupState } from './state';
import { armCmd, disarmCmd, trackWhy } from './wording';

const s0 = createSetupState(getSetup(), getTracks(), 0);

describe('wording', () => {
  it('previews the exact arm and disarm commands', () => {
    expect(armCmd('T3', 'governor')).toBe('glab mr create --source-branch belay/arm-governor --title "Arm governor: tripwire and tier-gate"');
    expect(disarmCmd('T3', 'governor', '!4')).toBe('glab mr create --source-branch revert-arm-governor --title "Revert !4: disarm governor"');
  });
  it('says why a track is locked, ready or armed', () => {
    expect(trackWhy(s0, s0.arm.T1!)).toBe('locked · needs T3 Governor, T6 Scanners');
    expect(trackWhy(s0, s0.arm.T5!)).toBe('locked · needs a runner (step 6)');
    expect(trackWhy(s0, s0.arm.T3!)).toBe('ready · 1 MR');
    expect(trackWhy(s0, s0.arm.T4!)).toBe('armed · !3 · revert disarms');
  });
});
