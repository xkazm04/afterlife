// The live list's writes as a pure reducer: a done confirm records the item in "Sent this session" with the MR it named
// (the path the hook alone could not test without a DOM), and each item sends on its own.
import { describe, expect, it } from 'vitest';
import type { NeedsYouItem } from '@/lib/demo';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { NO_ANSWER } from '@/server/actions/words';
import { canAsk, canRun } from './slot';
import { LIVE_EMPTY, liveAnswers, liveReduce, liveViews, type LiveAction, type LiveState } from './liveActs';

const item: NeedsYouItem = { id: 'promote:p:qa.file-bug', kind: 'promote', title: 'Promote T7 qa · qa.file-bug', to: 'hands_off', does: 'Opens a policy MR.' };
const other = 'readmit:p:patch-bump';
const preview: ActionPreview = {
  kind: 'promote-class', title: 'Promote', summary: 's', risk: 'policy', previewId: 'abc', mode: 'live', diff: ['+ x'],
  commands: [{ display: 'glab mr create', argv: [], risk: 'policy' }],
};
const live = (...a: LiveAction[]): LiveState => a.reduce(liveReduce, LIVE_EMPTY);
const shown = (id: string): LiveAction => ({ type: 'viewed', id, view: { kind: 'preview', preview } });
const sendIt: LiveAction = { type: 'sending', id: item.id };
const done: ActionResponse = { status: 'done', preview, results: [{ display: 'd', exit: 0, ok: true, simulated: false, made: '!22' }] };

describe('the live list on the slot', () => {
  it('a done confirm keeps the item in Sent this session, with the MR it named', () => {
    const s = liveReduce(live(shown(item.id), sendIt), { type: 'ran', id: 'promote:p:qa.file-bug', item, response: done });
    expect(s.sent[item.id]).toBe(item);
    expect(s.slots[item.id]?.answer?.mr).toBe('!22');
    expect(liveAnswers(s)[item.id]?.text).toContain('!22');
  });

  it('one item in flight does not hold another one back', () => {
    const s = live(shown(item.id), shown(other), sendIt);
    expect(canRun(s.slots[item.id])).toBe(false);
    expect(canRun(s.slots[other])).toBe(true);
  });

  it('no answer closes Run, says so, and the write can be asked for again', () => {
    const s = live(shown(item.id), sendIt, { type: 'ran', id: item.id, item, response: null });
    expect(s.sent[item.id]).toBeUndefined();
    expect(liveViews(s)[item.id]?.kind).toBe('refused');
    expect(liveAnswers(s)[item.id]?.text).toBe(NO_ANSWER);
    expect(canAsk(s.slots[item.id])).toBe(true);
    expect(canRun(liveReduce(liveReduce(s, { type: 'retry', id: item.id }), shown(item.id)).slots[item.id])).toBe(true);
  });
});
