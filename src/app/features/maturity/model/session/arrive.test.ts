import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { makeCtx } from '../ctx';
import { reduce } from '../reducer';
import { initialState } from '../state';
import { arrive } from './arrive';

const ctx = makeCtx(DEMO.maturity, DEMO.stages);

describe('arrive: the core slice landing in the Maturity session', () => {
  it('the first arrival is the initial state', () => {
    expect(arrive(null, ctx, null)).toEqual(initialState(ctx));
  });

  it('a re-read of the same scan keeps everything the person did, a simulated rescan stamp included', () => {
    let s = reduce(initialState(ctx), { type: 'mode', mode: 'target' }, ctx);
    s = reduce(s, { type: 'select', stage: 'plan' }, ctx);
    s = reduce(s, { type: 'rescanAll' }, ctx);
    const again = makeCtx(structuredClone(DEMO.maturity), DEMO.stages);
    expect(arrive(s, again, ctx)).toEqual(s);
  });

  it('a new scan brings its rungs and time, and keeps the mode, selection and picks', () => {
    const s = reduce(reduce(initialState(ctx), { type: 'mode', mode: 'day0' }, ctx), { type: 'select', stage: 'plan' }, ctx);
    const m = structuredClone(DEMO.maturity);
    m.scannedAt = '09:01';
    const rung = m.rungs[0];
    if (rung) rung.now = 4;
    const next = makeCtx(m, DEMO.stages);
    const out = arrive(s, next, ctx);
    expect(out.scannedAt).toBe('09:01');
    expect(out.now[rung?.stage ?? 'plan']).toBe(4);
    expect(out).toMatchObject({ mode: 'day0', sel: 'plan', picked: s.picked });
    expect(out.animKey).toBe(s.animKey + 1);
  });

  it('a pick of a gap the new read no longer proposes goes', () => {
    const s = initialState(ctx);
    expect(s.picked.length).toBeGreaterThan(0);
    const m = { ...structuredClone(DEMO.maturity), proposals: [] };
    expect(arrive(s, makeCtx(m, DEMO.stages), ctx).picked).toEqual([]);
  });
});
