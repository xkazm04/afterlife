import { describe, expect, it } from 'vitest';
import { reduce } from './reducer';
import { initialState } from './state';
import { nextStage, stepsView } from './steps';
import { ctx } from './testCtx';

describe('stepsView', () => {
  it('starts on Pick with the picked count, Send loud, After merge disabled', () => {
    const v = stepsView(initialState(ctx), ctx);
    expect(v.map((x) => [x.name, x.enabled, x.current, x.count])).toEqual([
      ['Pick', true, true, 2],
      ['Preview', true, false, 2],
      ['Send', true, false, 2],
      ['After merge', false, false, 0],
    ]);
    expect(v.find((x) => x.k === 3)?.loud).toBe(true);
  });
  it('marks the earlier steps as past', () => {
    const s = reduce(initialState(ctx), { type: 'go', step: 3 }, ctx);
    expect(stepsView(s, ctx).map((x) => x.past)).toEqual([true, true, false, false]);
  });
  it('counts only MRs on Preview, and the in-flight gaps on After merge', () => {
    let s = reduce(initialState(ctx), { type: 'togglePick', id: 'g4' }, ctx);
    expect(stepsView(s, ctx)[0]?.count).toBe(3);
    expect(stepsView(s, ctx)[1]?.count).toBe(2);
    s = reduce(reduce(s, { type: 'go', step: 3 }, ctx), { type: 'send' }, ctx);
    const v = stepsView(s, ctx);
    expect(v[3]).toMatchObject({ enabled: true, current: true, count: 3 });
    expect(v[2]?.count).toBeNull();
  });
});

describe('nextStage', () => {
  it('wraps both ways', () => {
    expect(nextStage(ctx, 'govern', 1)).toBe('plan');
    expect(nextStage(ctx, 'plan', -1)).toBe('govern');
    expect(nextStage(ctx, 'secure', 1)).toBe('release');
  });
});
