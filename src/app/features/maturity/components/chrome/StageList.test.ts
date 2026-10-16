// The sidebar badge map is built from the screen's one definition of "picked and not yet sent" (pendingIds), not a copy.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { reduce, type Action } from '../../model/reducer';
import { initialState, pendingIds } from '../../model/state';
import { ctx } from '../../model/testCtx';
import { pickedByStage } from './StageList';

const run = (...a: Action[]) => a.reduce((s, x) => reduce(s, x, ctx), initialState(ctx));
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('pickedByStage', () => {
  it('maps each stage to its picked, unsent gap', () => {
    const s = run(...ctx.gaps.map((g): Action => ({ type: 'togglePick', id: g.id })));
    const pending = pendingIds(s, ctx);
    expect(pending.length).toBeGreaterThan(1);
    const want = Object.fromEntries(pending.flatMap((id) => ctx.gap(id) ?? []).map((g) => [g.stage, g.id]));
    expect(pickedByStage(pending, ctx)).toEqual(want);
    expect(Object.keys(want).length).toBeGreaterThan(1);
  });
  it('drops a gap once it is sent', () => {
    const s = run({ type: 'go', step: 3 }, { type: 'sent', opened: Object.fromEntries(pendingIds(initialState(ctx), ctx).map((id) => [id, null])), text: 'x' });
    expect(pendingIds(s, ctx)).toEqual([]);
    expect(pickedByStage(pendingIds(s, ctx), ctx)).toEqual({});
  });
});

describe('MaturityScreen', () => {
  it('does not restate the picked-and-unsent rule', () => {
    const src = stripComments(readFileSync(new URL('../../MaturityScreen.tsx', import.meta.url), 'utf8'));
    expect(src).not.toMatch(/picked\.includes/);
  });
});
