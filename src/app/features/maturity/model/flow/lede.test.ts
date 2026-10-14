import { describe, expect, it } from 'vitest';
import { reduce } from '../reducer';
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
});
