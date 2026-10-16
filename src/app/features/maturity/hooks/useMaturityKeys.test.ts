// An arrow press arms the focus jump only when it moves the selection: otherwise nothing clears it and the next click's jump is stray.
import { describe, expect, it } from 'vitest';
import { reduce, type Action } from '../model/reducer';
import { initialState } from '../model/state';
import { ctx } from '../model/testCtx';
import { movesSelection } from './useMaturityKeys';

const run = (...a: Action[]) => a.reduce((s, x) => reduce(s, x, ctx), initialState(ctx));

describe('movesSelection', () => {
  it('reports a move when the press moves the selection', () => {
    const s = run();
    expect(movesSelection(s, ctx, 1)).toBe(true);
    expect(movesSelection(s, ctx, -1)).toBe(true);
  });
  it('reports no move when the press leaves the selection where it was (one picked gap in Preview)', () => {
    const s = run({ type: 'go', step: 2 }, { type: 'togglePick', id: 'g2' }, { type: 'select', stage: ctx.gap('g1')?.stage ?? 'secure' });
    expect(reduce(s, { type: 'move', dir: 1 }, ctx).sel).toBe(s.sel);
    expect(movesSelection(s, ctx, 1)).toBe(false);
  });
});
