// useRepoll's four branches: demo simulates, an unwatched project simulates in live too, live says "Re-polling…" and
// then the action's answer, and a rejected action says it failed (never "Re-polled").
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repollAction } from '@/server/actions/repollAction';
import { makeProject } from '../model/testProject';
import { useRepoll } from './useRepoll';

vi.mock('@/server/actions/repollAction', () => ({ repollAction: vi.fn() }));
const action = vi.mocked(repollAction);

const watched = makeProject({ id: 'ledgerline' });
const unwatched = makeProject({ id: 'quiet', state: 'not-set-up' });
const byId = new Map([watched, unwatched].map((p) => [p.id, p]));

/** The hook's callback, taken from one server render (the node test env has no DOM to mount into). */
function repollFor(mode: 'demo' | 'live', simulate: (id: string) => string, say: (m: string) => void) {
  let fn: ((id: string) => void) | undefined;
  function Probe() {
    fn = useRepoll(mode, byId, simulate, say);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return fn!;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('useRepoll', () => {
  beforeEach(() => action.mockReset());

  it('demo: says what the simulation says and never calls the server', () => {
    const say = vi.fn();
    repollFor('demo', () => 'Re-polled ledgerline', say)('ledgerline');
    expect(say.mock.calls).toEqual([['Re-polled ledgerline']]);
    expect(action).not.toHaveBeenCalled();
  });

  it('live: an unwatched project has nothing to poll, so the simulation answers', () => {
    const say = vi.fn();
    repollFor('live', (id) => `${id}: not watched, nothing to poll`, say)('quiet');
    expect(say.mock.calls).toEqual([['quiet: not watched, nothing to poll']]);
    expect(action).not.toHaveBeenCalled();
  });

  it('live: says Re-polling first, then the answer of the action', async () => {
    action.mockResolvedValue({ ok: false, reason: '401 Unauthorized' });
    const say = vi.fn();
    repollFor('live', () => 'simulated', say)('ledgerline');
    expect(action).toHaveBeenCalledWith('ledgerline');
    await flush();
    expect(say.mock.calls).toEqual([['Re-polling ledgerline…'], ['Re-poll failed · ledgerline · 401 Unauthorized']]);
  });

  it('live: a rejected action says it failed, with its message or "no answer"', async () => {
    const say = vi.fn();
    action.mockRejectedValueOnce(new Error('fetch failed')).mockRejectedValueOnce('boom');
    const repoll = repollFor('live', () => 'simulated', say);
    repoll('ledgerline');
    repoll('ledgerline');
    await flush();
    expect(say.mock.calls.slice(2)).toEqual([['Re-poll failed · ledgerline · fetch failed'], ['Re-poll failed · ledgerline · no answer']]);
  });

  it('an id the fleet does not have says nothing', () => {
    const say = vi.fn();
    repollFor('live', () => 'simulated', say)('gone');
    expect(say).not.toHaveBeenCalled();
  });
});
