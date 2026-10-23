import { describe, expect, it } from 'vitest';
import { reduce, type Action } from '../reducer';
import { initialState } from '../state';
import { stageLede } from './lede';
import { ctx } from '../testCtx';

describe('stageLede', () => {
  it('says the rung, the next one and the gap that would lift it', () => {
    const gap = ctx.gaps[0]!;
    const line = stageLede(ctx, initialState(ctx), gap.stage);
    expect(line).toContain(`gap ${gap.id}`);
    expect(line).toMatch(/R\d/);
  });
  it('follows the gap once it is sent', () => {
    const gap = ctx.gaps[0]!;
    const s = reduce(initialState(ctx), { type: 'sent', opened: { [gap.id]: '!22' }, text: 'x' }, ctx);
    expect(stageLede(ctx, s, gap.stage)).toContain('opened');
  });
  it('words every phase in English, never the code name: no lift, and where the job ran', () => {
    const run = (...a: Action[]) => a.reduce((acc, x) => reduce(acc, x, ctx), initialState(ctx));
    const g1 = ctx.gap('g1')!;
    const g3 = ctx.gap('g3')!;
    const nolift = run({ type: 'sent', opened: { g1: '!22' }, text: 'x' }, { type: 'merge', id: 'g1' }, { type: 'rescanGap', id: 'g1' });
    expect(stageLede(ctx, nolift, g1.stage)).toContain('gap g1 no lift: configured, not exercised');
    expect(stageLede(ctx, run({ type: 'sent', opened: { g1: '!22' }, text: 'x' }, { type: 'merge', id: 'g1' }, { type: 'rescanGap', id: 'g1' }, { type: 'ran', id: 'g1' }), g1.stage)).toContain('gap g1 ran on main');
    const tag = run({ type: 'togglePick', id: 'g3' }, { type: 'sent', opened: { g3: '!46' }, text: 'x' }, { type: 'merge', id: 'g3' }, { type: 'rescanGap', id: 'g3' }, { type: 'ran', id: 'g3' });
    expect(stageLede(ctx, tag, g3.stage)).toContain('gap g3 ran in the tagged release');
    expect(stageLede(ctx, nolift, g1.stage)).not.toMatch(/nolift/);
  });
});
