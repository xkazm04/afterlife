// The Stability card's copy: the count, median size, red pipelines with their n and reverts; no MRs and not read said so.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { foldStability, stabilityLine } from '@/lib/stability/stability';
import { StabilitySection } from './StabilitySection';

describe('stabilityLine', () => {
  it('names the red rate with its n', () => {
    const s = foldStability([
      { size: 10, pipeline: 'failed', reverted: false },
      { size: 30, pipeline: 'success', reverted: true },
      { size: 20, pipeline: 'running', reverted: false },
    ]);
    expect(stabilityLine(s)).toBe('3 agent MRs in 7 d · median size 20 lines · red pipelines 50% (1 of 2) · reverts 1');
  });
  it('no MRs, and unknown sizes and pipelines, in words', () => {
    expect(stabilityLine(foldStability([]))).toBe('no agent MRs in 7 d');
    expect(stabilityLine(foldStability([{ size: null, pipeline: null, reverted: false }]))).toBe('1 agent MR in 7 d · median size unknown · red pipelines: none final yet · reverts 0');
  });
});

describe('StabilitySection', () => {
  it('not read says so, never zero', () => {
    const out = renderToStaticMarkup(<StabilitySection s={undefined} demo={false} />);
    expect(out).toContain('Not read');
    expect(out).not.toContain('0%');
  });
  it('the demo says what it counted', () => {
    expect(renderToStaticMarkup(<StabilitySection s={foldStability([])} demo />)).toContain('Demo: counted from the demo');
  });
});
