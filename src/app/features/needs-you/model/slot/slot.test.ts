// One write lifecycle for every server-planned write: ask, preview, confirm, answer. The slot says when Run is open and
// when the write may be asked for again; a confirm with no answer closes Run until it is (the write may have run).
import { describe, expect, it } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { NO_ANSWER } from '@/server/actions/words';
import { pickNeedsYouDemo } from '../../data/pick';
import { buildOutItem } from '../outbox/outbox';
import { reduce } from '../reducer';
import { keysToAsk } from '../run';
import { initialState } from '../state';
import type { Action, NeedsState } from '../types';
import { asked, beginSend, canAsk, canRun, settle, viewed, type WriteSlot } from './slot';

const demo = pickNeedsYouDemo();
const preview = (id: string): ActionPreview => ({
  kind: 'promote-class', title: 'Promote', summary: 's', risk: 'policy', previewId: id, mode: 'live', diff: ['+ x'],
  commands: [{ display: `glab api ${id}`, argv: [], risk: 'policy' }],
});
const ready = (id = 'p1'): WriteSlot => viewed(asked(), { kind: 'preview', preview: preview(id) });
const sending = (): WriteSlot => beginSend(ready())!;
const run = (s: NeedsState, ...a: Action[]) => a.reduce((acc, x) => reduce(acc, x, demo), s);

describe('the slot', () => {
  it('changed puts the new preview on screen and Run stays open', () => {
    const s = settle(ready('p1'), { status: 'changed', preview: preview('p2') }, 'w');
    expect(s.phase).toBe('ready');
    expect(s.view?.kind === 'preview' && s.view.preview.previewId).toBe('p2');
    expect(s.answer?.status).toBe('changed');
    expect(canRun(s)).toBe(true);
  });

  it('refused replaces the write with its reason: nothing to run, and it may be asked for again', () => {
    const s = settle(ready(), { status: 'refused', reason: 'cooldown until 2026-11-01' }, 'w');
    expect(s.view).toEqual({ kind: 'refused', reason: 'cooldown until 2026-11-01' });
    expect(canRun(s)).toBe(false);
    expect(canAsk(s)).toBe(true);
  });

  it('done records the MR GitLab named and closes Run', () => {
    const r: ActionResponse = { status: 'done', preview: preview('p1'), results: [{ display: 'd', exit: 0, ok: true, simulated: false, made: '!22' }] };
    const s = settle(sending(), r, 'w');
    expect(s.phase).toBe('answered');
    expect(s.answer).toMatchObject({ status: 'done', mr: '!22' });
    expect(canRun(s)).toBe(false);
  });

  it('no answer is unsure: Run is closed until the write is asked for again', () => {
    const s = settle(sending(), null, 'w');
    expect(s.phase).toBe('unsure');
    expect(s.answer?.text).toBe(NO_ANSWER);
    expect(canRun(s)).toBe(false);
    expect(canAsk(s)).toBe(true);
    expect(canRun(viewed(asked(s), { kind: 'preview', preview: preview('p3') }))).toBe(true);
  });

  it('a second send, or a send with no preview yet, is never begun', () => {
    expect(beginSend(sending())).toBeNull();
    expect(beginSend(asked())).toBeNull();
  });
});

describe('the desk on the slot', () => {
  it('a refused or unreachable preview can be asked for again', () => {
    const s = run(initialState(demo), { type: 'select', id: 'n1' }, { type: 'write', key: 'n1', view: { kind: 'refused', reason: 'unreachable' } });
    expect(keysToAsk(s, demo)).not.toContain('n1');
    expect(keysToAsk(run(s, { type: 'retry', key: 'n1' }), demo)).toContain('n1');
  });

  it('a confirm with no answer stays staged, and its outbox item has nothing to run and says why', () => {
    const staged = run(initialState(demo), { type: 'act', action: 'stage-n1' }, { type: 'write', key: 'n1', view: { kind: 'preview', preview: preview('p1') } });
    expect(staged.status.n1).toBe('staged');
    const s = run(staged, { type: 'ran', key: 'n1', response: null });
    expect(s.status.n1).toBe('staged');
    const item = buildOutItem('n1', demo, s.writes);
    expect(item?.commands).toEqual([]);
    expect(item?.note).toContain('may or may not have run');
    expect(s.out.find((o) => o.key === 'n1')).toMatchObject({ commands: [], note: item?.note });
    expect(s.notice?.text).toBe(NO_ANSWER);
  });
});
