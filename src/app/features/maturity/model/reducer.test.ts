import { describe, expect, it } from 'vitest';
import { reduce, type Action } from './reducer';
import { initialState, pendingIds, type MaturityState } from './state';
import { ctx } from './testCtx';

const run = (s: MaturityState, ...actions: Action[]) => actions.reduce((acc, a) => reduce(acc, a, ctx), s);
const start = () => initialState(ctx);
/** g1 and g2 picked (the dataset), sent, and opened. */
const sent = () => run(start(), { type: 'go', step: 3 }, { type: 'sent', opened: { g1: '!22', g2: null }, text: 'the answers' });

describe('initial state', () => {
  it('starts at Now, on secure, on step 1, with the dataset picks', () => {
    const s = start();
    expect(s).toMatchObject({ mode: 'now', sel: 'secure', step: 1, sheet: false });
    expect(pendingIds(s, ctx)).toEqual(['g1', 'g2']);
    expect(s.now.secure).toBe(3);
  });
});

describe('picking', () => {
  it('toggles a pick, selects its stage, and says nothing was written', () => {
    const s = run(start(), { type: 'togglePick', id: 'g3' });
    expect(pendingIds(s, ctx)).toEqual(['g1', 'g2', 'g3']);
    expect(s.sel).toBe('release');
    expect(s.notice?.text).toBe('picked g3 · nothing written');
    const u = run(s, { type: 'togglePick', id: 'g3' });
    expect(pendingIds(u, ctx)).toEqual(['g1', 'g2']);
    expect(u.notice?.text).toBe('unpicked g3 · nothing written');
  });
  it('changing the picks goes back to step 1 from the later steps', () => {
    const s = run(start(), { type: 'go', step: 2 }, { type: 'go', step: 3 }, { type: 'togglePick', id: 'g3' });
    expect(s.step).toBe(1);
    expect(s.sheet).toBe(false);
  });
});

describe('stepper', () => {
  it('Preview and Send need a pick; After merge needs a send', () => {
    const none = run(start(), { type: 'togglePick', id: 'g1' }, { type: 'togglePick', id: 'g2' });
    expect(run(none, { type: 'go', step: 2 }).step).toBe(1);
    expect(run(none, { type: 'go', step: 3 }).step).toBe(1);
    expect(run(start(), { type: 'go', step: 4 }).step).toBe(1);
  });
  it('Preview selects the first picked gap and move walks the picked gaps', () => {
    const s = run(start(), { type: 'go', step: 2 });
    expect(s.pv).toBe('g1');
    expect(s.sel).toBe('secure');
    const n = run(s, { type: 'move', dir: 1 });
    expect(n.pv).toBe('g2');
    expect(n.sel).toBe('create');
    expect(run(n, { type: 'move', dir: 1 }).pv).toBe('g1');
  });
  it('outside Preview, move walks the nine stages and wraps', () => {
    expect(run(start(), { type: 'move', dir: 1 }).sel).toBe('release');
    expect(run({ ...start(), sel: 'plan' }, { type: 'move', dir: -1 }).sel).toBe('govern');
  });
  it('Send opens the sheet; Cancel goes back to Preview', () => {
    const s = run(start(), { type: 'go', step: 3 });
    expect(s).toMatchObject({ step: 3, sheet: true });
    expect(run(s, { type: 'cancelSheet' })).toMatchObject({ step: 2, sheet: false });
  });
});

describe('send', () => {
  it('opens the MRs as you, empties the picks and moves to After merge', () => {
    const s = sent();
    expect(s.flow).toEqual({ g1: 'opened', g2: 'opened' });
    expect(s.picked).toEqual([]);
    expect(s).toMatchObject({ step: 4, sheet: false, sel: 'secure' });
    expect(s.mrs).toEqual({ g1: '!22' }); // only the MR the response named
    expect(s.notice?.text).toBe('the answers');
    expect(s.now.secure).toBe(3);
  });
  it('moves no rung and records no credit: the next scan proves it', () => {
    const s = sent();
    expect(s.now).toEqual(start().now);
    expect(s.log).toEqual([]);
  });
  it('a gap that was not opened stays picked, and a probe has no send at all', () => {
    const s = run(start(), { type: 'togglePick', id: 'g4' }, { type: 'go', step: 3 }, { type: 'sent', opened: { g1: null }, text: 'x' });
    expect(s.flow).toEqual({ g1: 'opened' });
    expect(s.picked).toEqual(['g2', 'g4']);
  });
});

describe('credit', () => {
  it('a policy is credited on the first rescan after the merge', () => {
    const s = run(sent(), { type: 'merge', id: 'g2' }, { type: 'rescanGap', id: 'g2' });
    expect(s.flow.g2).toBe('credited');
    expect(s.now.create).toBe(3);
    expect(s.log).toEqual([{ mr: 'gap g2', stage: 'create', move: 'R2 → R3', verdict: 'credited', why: 'rescan 14:24 (simulated)' }]);
    expect(s.scannedAt).toBe('14:24');
    expect(s.ageMin).toBe(0);
  });
  it('a job that has not run is no lift: configured, not exercised, and the rung stays', () => {
    const s = run(sent(), { type: 'merge', id: 'g1' }, { type: 'rescanGap', id: 'g1' });
    expect(s.flow.g1).toBe('nolift');
    expect(s.now.secure).toBe(3);
    expect(s.log).toEqual([]);
    expect(s.notice?.text).toBe('rescan · engine v1 · secure stays R3: configured, not exercised (simulated)');
  });
  it('credits once the pipeline ran on main, then the rope redraws', () => {
    const lift = run(sent(), { type: 'merge', id: 'g1' }, { type: 'rescanGap', id: 'g1' });
    const s = run(lift, { type: 'ran', id: 'g1' }, { type: 'rescanGap', id: 'g1' });
    expect(s.flow.g1).toBe('credited');
    expect(s.now.secure).toBe(4);
    expect(s.animKey).toBe(lift.animKey + 1);
    expect(s.notice?.text).toBe('rescan · engine v1 · secure R3 → R4 credited (simulated)');
  });
  it('ignores out-of-order steps: no rescan before the merge, no run before a no lift', () => {
    const s = sent();
    expect(run(s, { type: 'rescanGap', id: 'g1' }).flow.g1).toBe('opened');
    expect(run(s, { type: 'ran', id: 'g1' }).flow.g1).toBe('opened');
    expect(run(s, { type: 'merge', id: 'g1' }, { type: 'merge', id: 'g1' }).flow.g1).toBe('merged');
  });
  it('the tagged release gap says so when it runs', () => {
    const s = run(start(), { type: 'togglePick', id: 'g3' }, { type: 'go', step: 3 }, { type: 'sent', opened: { g3: null }, text: 'x' }, { type: 'merge', id: 'g3' }, { type: 'rescanGap', id: 'g3' }, { type: 'ran', id: 'g3' });
    expect(s.notice?.text).toBe('tagged release pipeline ran · new job passed (simulated)');
  });
  it('After merge falls back to Pick when nothing is in flight', () => {
    expect(run({ ...start(), step: 4 }, { type: 'select', stage: 'plan' }).step).toBe(1);
  });
});

describe('rescan and modes', () => {
  it('Rescan stamps the time and moves no rung', () => {
    const s = run(start(), { type: 'rescanAll' });
    expect(s.scannedAt).toBe('14:24');
    expect(s.now).toEqual(start().now);
    expect(s.notice?.text).toBe('rescan · engine v1 · read only · no rung moved (simulated)');
  });
  it('changing the crag mode redraws the ropes', () => {
    const s = run(start(), { type: 'mode', mode: 'target' });
    expect(s.mode).toBe('target');
    expect(s.animKey).toBe(1);
  });
  it('remembers which diff file tab each gap shows and which inspector sections are open', () => {
    const s = run(start(), { type: 'file', id: 'g1', index: 1 }, { type: 'section', key: 'day0', open: true });
    expect(s.file.g1).toBe(1);
    expect(s.open.day0).toBe(true);
  });
});
