// The arm click: one confirm per click that is allowed, the track moves only on a done, and a second click while the
// first is still out sends nothing (the button stays enabled for the seconds a git push and an MR take).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetup } from '@/lib/demo';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { NO_ANSWER } from '@/server/actions/words';
import { setupReducer, type SetupAction } from '../model/flow/reducer';
import { createSetupState } from '../model/flow/state';
import type { SetupState } from '../model/types';
import type { ArmWrites } from './useArmWrite';

const sent: { calls: number; next: () => Promise<ActionResponse | null> } = { calls: 0, next: () => Promise.resolve(null) };
vi.mock('../write/arm', () => ({ sendArm: () => (sent.calls++, sent.next()) }));
const { armClick } = await import('./armFlow');

const preview: ActionPreview = { kind: 'arm-track', title: 't', summary: 's', commands: [], risk: 'low', diff: [], previewId: 'p1', mode: 'demo' };
const done = (): ActionResponse => ({ status: 'done', preview, results: [{ display: 'glab mr create', exit: 0, ok: true, simulated: false, made: '!22', url: 'https://gitlab.example/mr/22' }] });

function rig() {
  const ref = { current: createSetupState(getSetup(), 0) as SetupState };
  const said: string[] = [];
  const toasts: string[] = [];
  const calls = { put: 0, clear: 0 };
  const writes = { viewOf: () => ({ kind: 'preview', preview }), put: () => calls.put++, clear: () => calls.clear++, want: () => {}, round: 0 } as unknown as ArmWrites;
  const dispatch = (a: SetupAction) => {
    ref.current = setupReducer(ref.current, a);
  };
  const deps = { now: () => ref.current, dispatch, writes, say: (m: string) => said.push(m), toast: (m: string) => toasts.push(m), out: new Set<string>() };
  return { ref, said, toasts, calls, send: (id: string, revert: boolean) => armClick(deps, id, revert) };
}

beforeEach(() => {
  sent.calls = 0;
  sent.next = () => Promise.resolve(done());
});

describe('the arm click', () => {
  it('a done answer opens the track on the MR GitLab named', async () => {
    const r = rig();
    await r.send('T3', false);
    expect(r.ref.current.arm.T3).toMatchObject({ st: 'open', mr: '!22', url: 'https://gitlab.example/mr/22' });
    expect([sent.calls, r.calls.clear, r.toasts]).toEqual([1, 1, ['Done · arm T3 · !22']]);
  });
  it('a track that is not ready (or, for a disarm, not armed) sends nothing', async () => {
    const r = rig();
    await r.send('T1', false);
    await r.send('T3', true);
    expect(sent.calls).toBe(0);
  });
  it('a server that does not answer clears the previews and says the write may have run', async () => {
    const r = rig();
    sent.next = () => Promise.reject(new Error('socket hang up'));
    await r.send('T3', false);
    expect([r.ref.current.arm.T3?.st, r.calls.clear, r.toasts]).toEqual(['ready', 1, [NO_ANSWER]]);
  });
  it('a second click while the first is still out sends nothing, and the track can be sent again once it settles', async () => {
    const r = rig();
    let settle: (v: ActionResponse) => void = () => {};
    sent.next = () => new Promise<ActionResponse>((res) => (settle = res));
    const first = r.send('T3', false);
    const second = r.send('T3', false);
    await Promise.resolve();
    expect(sent.calls).toBe(1);
    settle(done());
    await Promise.all([first, second]);
    expect(r.ref.current.arm.T3?.st).toBe('open');
    sent.next = () => Promise.resolve({ status: 'refused', reason: 'no' });
    await r.send('T6', false);
    expect(sent.calls).toBe(2);
  });
  it('a refused first click frees the track for the next one', async () => {
    const r = rig();
    sent.next = () => Promise.resolve({ status: 'refused', reason: 'live mode has not finished its first poll' });
    await r.send('T3', false);
    await r.send('T3', false);
    expect(sent.calls).toBe(2);
  });
});
