import { describe, expect, it } from 'vitest';
import { reduce, type Action } from '../reducer';
import { initialState, type MaturityState } from '../state';
import { ctx } from '../testCtx';
import { nextMove, rescanTitle } from './moves';

const run = (s: MaturityState, ...actions: Action[]) => actions.reduce((acc, a) => reduce(acc, a, ctx), s);
const start = () => initialState(ctx);
const gap = (id: string) => ctx.gap(id)!;
/** g1 and g2 sent and merged; g1 (a job that must run) has run on main after its no lift. */
const ranAndMerged = () =>
  run(start(), { type: 'go', step: 3 }, { type: 'sent', opened: { g1: '!22', g2: null }, text: 'x' }, { type: 'merge', id: 'g1' }, { type: 'rescanGap', id: 'g1' }, { type: 'ran', id: 'g1' }, { type: 'merge', id: 'g2' });

describe('nextMove: the one next move of a sent gap', () => {
  it('opened merges, a no lift runs its job (main or tagged release), merged or ran rescans, a decided gap has none', () => {
    expect(nextMove('opened', gap('g1'))).toEqual({ action: { type: 'merge', id: 'g1' }, label: 'Merge in GitLab' });
    expect(nextMove('nolift', gap('g3'))).toEqual({ action: { type: 'ran', id: 'g3' }, label: 'Tagged release runs' });
    expect(nextMove('nolift', gap('g1'))).toEqual({ action: { type: 'ran', id: 'g1' }, label: 'Pipeline runs on main' });
    expect(nextMove('merged', gap('g2'))?.action).toEqual({ type: 'rescanGap', id: 'g2' });
    expect(nextMove('ran', gap('g1'))?.action).toEqual({ type: 'rescanGap', id: 'g1' });
    expect(nextMove('credited', gap('g1'))).toBeNull();
    expect(nextMove('probed', gap('g1'))).toBeNull();
  });
});

describe('rescanAll decides every merged gap at once', () => {
  it('credits a gap that ran and a policy that was merged, in one notice naming both', () => {
    const s = ranAndMerged();
    const r = run(s, { type: 'rescanAll' });
    const [g1, g2] = [gap('g1'), gap('g2')];
    expect(r.flow).toMatchObject({ g1: 'credited', g2: 'credited' });
    expect(r.now[g1.stage]).toBe(g1.to);
    expect(r.now[g2.stage]).toBe(g2.to);
    expect(r.log.length).toBe(s.log.length + 2);
    expect(r.notice?.seq).toBe((s.notice?.seq ?? 0) + 1);
    expect(r.notice?.text).toMatch(/^rescan · engine v1 · .*g1.*g2.*\(simulated\)$/);
    expect(r.animKey).toBe(s.animKey + 1);
  });
  it('a merged job that has not run stays: no lift, configured, not exercised, and no rung moves', () => {
    const s = run(start(), { type: 'go', step: 3 }, { type: 'sent', opened: { g1: '!22' }, text: 'x' }, { type: 'merge', id: 'g1' });
    const r = run(s, { type: 'rescanAll' });
    expect(r.flow.g1).toBe('nolift');
    expect(r.now).toEqual(s.now);
    expect(r.log).toEqual(s.log);
    expect(r.notice?.text).toMatch(/g1 .*stays .*configured, not exercised/);
  });
  it('GUARD: with nothing merged it is today\'s read-only rescan', () => {
    const r = run(start(), { type: 'rescanAll' });
    expect(r.scannedAt).toBe('14:24');
    expect(r.now).toEqual(start().now);
    expect(r.notice?.text).toBe('rescan · engine v1 · read only · no rung moved (simulated)');
  });
});

describe('rescanTitle: the toolbar Rescan says what it will decide', () => {
  it('counts the merged gaps it decides, and keeps today\'s words when there are none', () => {
    expect(rescanTitle(ranAndMerged(), ctx)).toBe('Rescan, read only (R) · decides 2 merged gaps (simulated)');
    expect(rescanTitle(start(), ctx)).toBe('Rescan, read only (R). Simulated: nothing is scanned, no rung moves');
  });
});
