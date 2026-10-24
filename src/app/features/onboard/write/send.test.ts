// The Run click's loop over the writes on screen. The actions are mocked: this is the screen's side.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview } from '@/server/actions/types';
import { NO_ANSWER } from '@/server/actions/words';
import type { OnboardIntent } from '../model/batch';
import type { WriteView } from './write';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);

const { noAnswer, sendEach } = await import('./send');

const arm: OnboardIntent = { kind: 'arm-track', project: 'fx-rates', track: 'T6' };
const enroll: OnboardIntent = { kind: 'enroll-track', project: 'ledgerline', track: 'T6' };
const preview = (id: string): ActionPreview => ({
  kind: 'arm-track', title: 't', summary: 's', commands: [{ display: 'glab api', argv: ['api'], risk: 'low' }],
  risk: 'low', diff: [], previewId: id, mode: 'demo', branch: 'belay/arm-T6',
});
const onScreen: Record<string, WriteView> = {
  'fx-rates:arm-track:T6': { kind: 'preview', preview: preview('p1') },
  'ledgerline:enroll-track:T6': { kind: 'preview', preview: preview('p2') },
};

beforeEach(() => actions.confirmAction.mockReset());

describe('sendEach', () => {
  it("a confirm that threw keeps NO_ANSWER's words and says why, digest included; the next write still goes", async () => {
    const e = Object.assign(new Error('An error occurred in the Server Components render'), { digest: '2187' });
    actions.confirmAction.mockRejectedValueOnce(e).mockResolvedValueOnce({ status: 'done', preview: preview('p2'), results: [] });
    const put = vi.fn();
    const r = await sendEach([arm, enroll], (k) => onScreen[k], put);
    expect(r.notSent).toEqual([`arm T6 on fx-rates: ${NO_ANSWER} (An error occurred in the Server Components render (digest 2187))`]);
    expect(r.opened).toEqual({ ledgerline: { mr: null, branch: 'belay/arm-T6' } });
    expect(put).not.toHaveBeenCalled();
    expect(noAnswer('enroll T6 on a', 'boom')).toBe(`enroll T6 on a: ${NO_ANSWER} (boom)`);
  });

  it('a thrown non-Error still names that the server did not answer', async () => {
    actions.confirmAction.mockRejectedValueOnce('x');
    const r = await sendEach([arm], (k) => onScreen[k], () => {});
    expect(r.notSent[0]).toBe(noAnswer('arm T6 on fx-rates', 'the server did not answer'));
  });

  it('sends nothing without a preview on screen, and puts back a changed or refused answer', async () => {
    const none = await sendEach([arm], () => undefined, () => {});
    expect(none.notSent).toEqual(['arm T6 on fx-rates: no exact MR on screen']);
    expect(actions.confirmAction).not.toHaveBeenCalled();
    actions.confirmAction.mockResolvedValueOnce({ status: 'changed', preview: preview('p3') }).mockResolvedValueOnce({ status: 'refused', reason: 'no' });
    const put = vi.fn();
    const r = await sendEach([arm, enroll], (k) => onScreen[k], put);
    expect(r.opened).toEqual({});
    expect(r.notSent).toHaveLength(2);
    expect(put).toHaveBeenNthCalledWith(1, 'fx-rates:arm-track:T6', { kind: 'preview', preview: preview('p3') });
    expect(put.mock.calls[1]![0]).toBe('ledgerline:enroll-track:T6');
    expect(put.mock.calls[1]![1]).toMatchObject({ kind: 'refused' });
  });
});
