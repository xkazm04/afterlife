import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../data/pick';
import { reduce } from './reducer';
import { initialState } from './state';
import type { Action, ActionId, NeedsState } from './types';

const demo = pickNeedsYouDemo();
const run = (s: NeedsState, ...actions: Action[]): NeedsState => actions.reduce((acc, a) => reduce(acc, a, demo), s);
const act = (action: ActionId): Action => ({ type: 'act', action });
const start = (): NeedsState => initialState(demo);
const keys = (s: NeedsState) => s.out.map((o) => o.key);

describe('read before act', () => {
  it('will not stage the sign-off until the draft is read', () => {
    const s = run(start(), act('stage-n2'));
    expect(s.out).toHaveLength(0);
    expect(s.status.n2).toBe('open');
  });
  it('reading the draft selects the row, opens its section and asks the screen to reveal it', () => {
    const s = run(start(), act('read-draft'));
    expect(s.read.draft).toBe(true);
    expect(s.sel).toBe('n2');
    expect(s.sections['n2-draft']).toBe(true);
    expect(s.reveal).toEqual({ id: 1, key: 'n2-draft' });
  });
  it('opening the draft section by hand counts as reading it (and closing does not undo it)', () => {
    const s = run(start(), { type: 'section', key: 'n2-draft', open: true });
    expect(s.read.draft).toBe(true);
    expect(run(s, { type: 'section', key: 'n2-draft', open: false }).read.draft).toBe(true);
  });
  it('the incident note gates Re-admit the same way', () => {
    expect(run(start(), act('stage-n4')).out).toHaveLength(0);
    expect(keys(run(start(), act('read-note'), act('stage-n4')))).toEqual(['n4']);
  });
});

describe('staging and running', () => {
  it('stages the exact write and sends nothing', () => {
    const s = run(start(), act('read-draft'), act('stage-n2'));
    expect(s.status.n2).toBe('staged');
    expect(keys(s)).toEqual(['n2']);
    expect(s.sent).toHaveLength(0);
    expect(s.session).toHaveLength(0);
    expect(s.notice).toMatchObject({ channel: 'status', text: 'Staged · first in line in the outbox. Not sent.' });
  });
  it('puts the legal clock first in line however late it is staged', () => {
    const s = run(start(), act('stage-n1'), act('read-draft'), act('stage-n2'));
    expect(keys(s)).toEqual(['n2', 'n1']);
  });
  it('Run sends the sign-off: marks it sent, records it in the ledger and toasts who it ran as', () => {
    const s = run(start(), act('read-draft'), act('stage-n2'), { type: 'run', key: 'n2' });
    expect(s.out).toHaveLength(0);
    expect(s.status.n2).toBe('sent');
    expect(s.session[0]).toMatchObject({ kind: 'signoff', fresh: true });
    expect(s.notice?.text.startsWith('✓ ran as @operator')).toBe(true);
  });
  it('a policy MR never runs in the reducer: Run waits for the server (confirmAction)', () => {
    const staged = run(start(), act('stage-n1'));
    expect(run(staged, { type: 'run', key: 'n1' })).toBe(staged);
  });
  it('Run on something that is not staged does nothing', () => {
    expect(run(start(), { type: 'run', key: 'n1' })).toEqual(start());
  });
  it('Take back and Remove return the decision to open, with nothing sent', () => {
    const staged = run(start(), act('stage-n1'));
    for (const back of [act('unstage:n1'), { type: 'remove', key: 'n1' } as Action]) {
      const s = run(staged, back);
      expect(s.status.n1).toBe('open');
      expect(s.out).toHaveLength(0);
      expect(s.sent).toHaveLength(0);
    }
    expect(run(staged, { type: 'remove', key: 'n1' }).notice?.text).toBe('Removed. Nothing was sent.');
  });
  it('the grade moves to ready to sign only when the sign-off is run, then Submitted is noted once', () => {
    const s = run(start(), act('read-draft'), act('stage-n2'), { type: 'run', key: 'n2' });
    expect(s.status.n2).toBe('sent');
    expect(run(s, act('submitted')).submitted).toBe(true);
  });
});

describe('gaps', () => {
  it('opens with g1 and g2 picked; ticking toggles', () => {
    expect(start().gaps).toEqual({ g1: true, g2: true, g3: false, g4: false });
    expect(run(start(), act('tick:g3')).gaps.g3).toBe(true);
    expect(run(start(), act('tick:g1')).gaps.g1).toBe(false);
  });
  it('Stage picked stages one write per picked gap and leaves the others alone', () => {
    const s = run(start(), act('stage-gaps'));
    expect(keys(s)).toEqual(['g1', 'g2']);
    expect(s.gapStatus).toEqual({ g1: 'staged', g2: 'staged' });
    expect(s.notice?.text).toBe('2 gaps staged · 1 write each');
  });
  it('staging one gap ticks it, and taking it back clears its status', () => {
    const s = run(start(), act('stage-gap:g4'));
    expect(s.gaps.g4).toBe(true);
    expect(s.gapStatus.g4).toBe('staged');
    expect(run(s, act('unstage:g4')).gapStatus.g4).toBeUndefined();
  });
  it('running a gap records an MR (or an issue) as waiting for your review', () => {
    const s = run(start(), act('stage-gap:g1'), { type: 'run', key: 'g1' });
    expect(s.gapStatus.g1).toBe('sent');
    expect(s.session[0]).toMatchObject({ kind: 'gaps', ref: '!45 · waits for your review' });
  });
});

describe('the actions that skip the outbox', () => {
  it('Retire writes nothing: no staging, nothing sent, a ledger row that says so, and a toast that says so', () => {
    const s = run(start(), act('read-note'), act('stage-n4'), act('retire-n4'));
    expect(s.status.n4).toBe('retired');
    expect(s.out).toHaveLength(0);
    expect(s.sent).toHaveLength(0);
    expect(s.session[0]).toMatchObject({ kind: 'readmit', result: 'retired · no write', ref: 'nothing sent' });
    expect(s.notice).toMatchObject({ channel: 'toast', text: expect.stringMatching(/stays quarantined in belay-policy. Nothing was sent.$/) });
  });
  it('Not yet leaves a ledger row and no write; Show again takes the row back out', () => {
    const snoozed = run(start(), act('snooze-n1'));
    expect(snoozed.status.n1).toBe('snoozed');
    expect(snoozed.session[0]).toMatchObject({ result: 'not yet', ref: 'no write' });
    expect(snoozed.out).toHaveLength(0);
    const back = run(snoozed, act('unsnooze-n1'));
    expect(back.status.n1).toBe('open');
    expect(back.session).toHaveLength(0);
  });
  it('the runner check is unknown until the page was opened, then verified', () => {
    const none = run(start(), act('check-runner'));
    expect(none.runner.check).toBe('none');
    expect(none.status.n5).toBe('open');
    const ok = run(start(), act('open-runner'), act('check-runner'));
    expect(ok.runner.check).toBe('ok');
    expect(ok.status.n5).toBe('done');
    expect(ok.session[0]).toMatchObject({ kind: 'setup', result: 'verified' });
  });
});

describe('view state', () => {
  it('toggles groups and expands all', () => {
    expect(start().collapsed).toEqual(['hist']);
    expect(run(start(), { type: 'toggleGroup', id: 'clock' }).collapsed).toEqual(['hist', 'clock']);
    expect(run(start(), { type: 'toggleGroup', id: 'hist' }).collapsed).toEqual([]);
    expect(run(start(), { type: 'toggleGroup', id: 'hist', open: false }).collapsed).toEqual(['hist']);
    expect(run(start(), { type: 'expandAll' }).collapsed).toEqual([]);
  });
  it('a filter that hides the selection moves it to the first visible row', () => {
    const s = run({ ...start(), sel: 'n2' }, act('stage-n1'), { type: 'show', show: 'outbox' });
    expect(s.sel).toBe('n1');
  });
  it('This week expands the history, clears the filter and selects its group', () => {
    const s = run({ ...start(), show: 'waiting' }, { type: 'openHistory' });
    expect(s).toMatchObject({ show: 'all', sel: 'g:hist' });
    expect(s.collapsed).not.toContain('hist');
  });
  it('shows and hides the outbox, and remembers collapsed items', () => {
    expect(run(start(), act('out-toggle')).outboxOpen).toBe(false);
    expect(run(start(), act('out-off'), act('out-on')).outboxOpen).toBe(true);
    expect(run(start(), { type: 'itemShut', key: 'n1' }).itemsShut).toEqual(['n1']);
    expect(run(start(), { type: 'itemShut', key: 'n1' }, { type: 'itemShut', key: 'n1' }).itemsShut).toEqual([]);
  });
  it('each notice gets a new id so the screen shows it once', () => {
    const a = run(start(), act('stage-n1'));
    const b = run(a, act('unstage:n1'));
    expect(b.notice?.id).toBe((a.notice?.id ?? 0) + 1);
  });
});
