import { describe, expect, it } from 'vitest';
import { reduce } from './reducer';
import { initialState } from './state';
import { nextStage, stepTarget, stepsView } from './steps';
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
    s = reduce(reduce(s, { type: 'go', step: 3 }, ctx), { type: 'sent', opened: { g1: null, g2: null }, text: 'x' }, ctx);
    const v = stepsView(s, ctx);
    expect(v[3]).toMatchObject({ enabled: true, current: true, count: 2 });
    expect(v[2]?.count).toBe(1); // the probe stays picked: nothing sends it
  });
});

describe('nextStage', () => {
  it('wraps both ways', () => {
    expect(nextStage(ctx, 'govern', 1)).toBe('plan');
    expect(nextStage(ctx, 'plan', -1)).toBe('govern');
    expect(nextStage(ctx, 'secure', 1)).toBe('release');
  });
});

describe('stepTarget', () => {
  it('Preview lands on the picked gap\'s stage, After merge on the first sent gap\'s, Pick and Send on the list', () => {
    const pv = reduce(initialState(ctx), { type: 'go', step: 2 }, ctx);
    const gap = ctx.gap(pv.pv ?? '');
    expect(gap).toBeDefined();
    expect(stepTarget(ctx, pv, 2)).toBe(gap?.stage);
    expect(stepTarget(ctx, pv, 1)).toBeNull();
    expect(stepTarget(ctx, pv, 3)).toBeNull();
    const sent = reduce(pv, { type: 'sent', opened: { [gap?.id ?? '']: '!22' }, text: 'x' }, ctx);
    expect(stepTarget(ctx, sent, 4)).toBe(gap?.stage);
    expect(stepTarget(ctx, initialState(ctx), 4)).toBeNull();
  });
  it('After merge lands where the reducer put the selection: a sent gap\'s own stage stays, not the first sent gap\'s', () => {
    const [g1, g2] = [ctx.gap('g1')!, ctx.gap('g2')!];
    const sent = reduce(reduce(initialState(ctx), { type: 'go', step: 3 }, ctx), { type: 'sent', opened: { g1: '!22', g2: null }, text: 'x' }, ctx);
    const onG2 = reduce(reduce(sent, { type: 'go', step: 1 }, ctx), { type: 'select', stage: g2.stage }, ctx);
    const went = reduce(onG2, { type: 'go', step: 4 }, ctx);
    expect(went.sel).toBe(g2.stage);
    expect(stepTarget(ctx, went, 4)).toBe(went.sel);
    expect(stepTarget(ctx, reduce(reduce(onG2, { type: 'select', stage: g1.stage }, ctx), { type: 'go', step: 4 }, ctx), 4)).toBe(g1.stage);
  });
});
