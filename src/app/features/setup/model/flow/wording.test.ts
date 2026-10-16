import { describe, expect, it } from 'vitest';
import { getSetup } from '@/lib/demo';
import { createSetupState } from './state';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mergeLabel, mrName, noMrAddress, trackWhy } from './wording';

const s0 = createSetupState(getSetup(), 0);

describe('wording', () => {
  it('names an MR only as GitLab named it', () => {
    const t3 = s0.arm.T3!;
    expect(mrName({ ...t3, mr: '!22' })).toBe('!22');
    expect(mrName({ ...t3, mr: null })).toBe('the MR');
    expect(mrName({ ...t3, mr: null, simulated: true })).toBe('the simulated MR');
  });
  it('a revert MR says so wherever the MR to merge is named', () => {
    const t3 = s0.arm.T3!;
    expect(mergeLabel({ ...t3, mr: '!5', revert: true })).toBe('!5 (revert)');
    expect(mergeLabel({ ...t3, mr: '!5' })).toBe('!5');
    // the chip, the lede, the section title and the summary row all take their wording from mergeLabel, none re-derives it
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const root = join(__dirname, '..', '..', 'components');
    for (const f of ['inspector/nodeHead.ts', 'inspector/TrackPanel.tsx', 'inspector/TrackArmSection.tsx', 'summary/SetupSummary.tsx']) {
      expect(strip(readFileSync(join(root, f), 'utf8')), f).toContain('mergeLabel(a)');
    }
  });
  it('says why an MR cannot be opened, in demo and live', () => {
    expect(noMrAddress(true, 'the simulated MR')).toBe('Demo mode opened no MR: there is nothing to open');
    expect(noMrAddress(false, '!5')).toBe('GitLab gave no address for !5');
  });
  it('says why a track is locked, ready or armed', () => {
    expect(trackWhy(s0, s0.arm.T1!)).toBe('locked · needs T3 Governor, T6 Scanners');
    expect(trackWhy(s0, s0.arm.T5!)).toBe('locked · needs a runner (step 6)');
    expect(trackWhy(s0, s0.arm.T3!)).toBe('ready · 1 MR');
    expect(trackWhy(s0, s0.arm.T4!)).toBe('armed · revert disarms');
  });
});
