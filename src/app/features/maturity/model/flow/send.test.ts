// A gap's send has one owner, the layout's reducer: the sheet asks, sends and records through it, so no way the sheet goes
// away (the toolbar stepper, the sidebar, Cancel) can drop an answer the server already gave.
import { describe, expect, it } from 'vitest';
import type { ActionPreview } from '@/server/actions/types';
import { reduce, type Action } from '../reducer';
import { initialState, pendingIds, type MaturityState } from '../state';
import { ctx } from '../testCtx';

const run = (s: MaturityState, ...actions: Action[]) => actions.reduce((acc, a) => reduce(acc, a, ctx), s);
const preview = (id: string): ActionPreview => ({ kind: 'stage-gap-mr', title: id, summary: 's', risk: 'low', previewId: `pv-${id}`, mode: 'demo', diff: [], commands: [] });
const view = (id: string) => ({ kind: 'preview' as const, preview: preview(id) });
/** g1 and g2 picked (the dataset), the sheet open, both previews on screen. */
const open = () =>
  run(initialState(ctx), { type: 'go', step: 3 }, { type: 'ask', ids: ['g1', 'g2'] }, { type: 'viewed', id: 'g1', view: view('g1') }, { type: 'viewed', id: 'g2', view: view('g2') });
const done = { status: 'done' as const, text: 'opened !22', mr: '!22' };

describe('an answer is recorded the moment it arrives', () => {
  it('a done answer opens the gap with its MR while the sheet stays open', () => {
    const s = run(open(), { type: 'sending', ids: ['g1'] }, { type: 'answered', id: 'g1', answer: done });
    expect(s.flow.g1).toBe('opened');
    expect(s.mrs.g1).toBe('!22');
    expect(s.picked).not.toContain('g1');
    expect(s.sheet).toBe(true);
    expect(s.step).toBe(3);
  });
  it('a late answer arriving after the sheet closed is never dropped', () => {
    const closed = run(open(), { type: 'cancelSheet' });
    expect(closed.sheet).toBe(false);
    const late = run(closed, { type: 'answered', id: 'g1', answer: done });
    expect(late.flow.g1).toBe('opened');
    expect(late.mrs.g1).toBe('!22');
  });
});

describe('the sheet cannot be torn down mid-send', () => {
  it('the toolbar stepper does nothing while a send is in flight', () => {
    const s = run(open(), { type: 'sending', ids: ['g1'] });
    expect(s.send.g1?.phase).toBe('sending');
    const after = run(s, { type: 'go', step: 1 });
    expect(after.step).toBe(3);
    expect(after.sheet).toBe(true);
    expect(run(s, { type: 'cancelSheet' }).sheet).toBe(true);
  });
  it('once no send is in flight, Pick closes the sheet and keeps what was opened', () => {
    const s = run(open(), { type: 'sending', ids: ['g1'] }, { type: 'answered', id: 'g1', answer: done }, { type: 'go', step: 1 });
    expect(s.sheet).toBe(false);
    expect(s.flow.g1).toBe('opened');
    expect(s.mrs.g1).toBe('!22');
    expect(pendingIds(s, ctx)).toEqual(['g2']);
  });
});

describe('closing forgets the previews, not the sends', () => {
  it('Cancel clears the views, so opening again asks again; a gap already opened is not offered', () => {
    const s = run(open(), { type: 'cancelSheet' });
    expect(s.send).toEqual({});
    const again = run(s, { type: 'go', step: 3 });
    expect(again.sheet).toBe(true);
    expect(again.send).toEqual({});
    const sentOne = run(open(), { type: 'sending', ids: ['g1'] }, { type: 'answered', id: 'g1', answer: done }, { type: 'cancelSheet' }, { type: 'go', step: 3 });
    expect(pendingIds(sentOne, ctx)).toEqual(['g2']);
    expect(sentOne.send.g1).toBeUndefined();
  });
});
