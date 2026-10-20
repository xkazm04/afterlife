// Onboard's writes go through the server actions, as Setup's do: previewAction for the write on screen, confirmAction with
// that preview's id on the click. The actions are mocked: this is the screen's side.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import type { OnboardIntent } from '../model/batch';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);

const { askWrite, openedOf, sendWrite, writeKey } = await import('./write');

const intent: OnboardIntent = { kind: 'arm-track', project: 'fx-rates', track: 'T6' };
const preview: ActionPreview = {
  kind: 'arm-track', title: 'Arm T6 on fx-rates', summary: 'Opens an MR in acme-lab/risk/fx-rates as kazdanm.',
  commands: [{ display: 'glab api --method POST projects/9/merge_requests', argv: ['api'], risk: 'low' }],
  risk: 'low', diff: [], previewId: 'p1', mode: 'demo', branch: 'belay/arm-T6',
};

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('the onboard write round trip', () => {
  it('asks for the intent and shows the preview, or the refusal, it answers with; nothing is confirmed', async () => {
    actions.previewAction.mockResolvedValueOnce({ status: 'preview', preview } satisfies ActionResponse);
    expect(await askWrite(intent)).toEqual({ kind: 'preview', preview });
    expect(actions.previewAction).toHaveBeenCalledExactlyOnceWith(intent);
    actions.previewAction.mockResolvedValueOnce({ status: 'refused', reason: 'fx-rates is not a project Belay has read from GitLab yet' });
    expect(await askWrite(intent)).toEqual({ kind: 'refused', reason: 'fx-rates is not a project Belay has read from GitLab yet' });
    actions.previewAction.mockRejectedValueOnce(new Error('fetch failed'));
    expect(await askWrite(intent)).toEqual({ kind: 'refused', reason: 'fetch failed' });
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('confirms by the preview id on screen, and sends nothing without one', async () => {
    actions.confirmAction.mockResolvedValue({ status: 'done', preview, results: [] } satisfies ActionResponse);
    await sendWrite(intent, { kind: 'preview', preview });
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith(intent, 'p1');
    expect(await sendWrite(intent, { kind: 'refused', reason: 'x' })).toBeNull();
    expect(await sendWrite(intent, undefined)).toBeNull();
    expect(actions.confirmAction).toHaveBeenCalledTimes(1);
  });

  it('waits on the MR GitLab named, or on the branch when it named none; anything but done opens nothing', () => {
    const made = { display: 'x', exit: 0, ok: true, simulated: false, made: '!61' };
    expect(openedOf({ status: 'done', preview, results: [made] })).toEqual({ mr: '!61', branch: 'belay/arm-T6' });
    expect(openedOf({ status: 'done', preview, results: [] })).toEqual({ mr: null, branch: 'belay/arm-T6' });
    expect(openedOf({ status: 'refused', reason: 'no' })).toBeNull();
    expect(openedOf({ status: 'changed', preview })).toBeNull();
    expect(openedOf(null)).toBeNull();
    expect(writeKey(intent)).toBe('fx-rates:arm-track:T6');
  });
});
