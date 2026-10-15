// Setup's Enroll goes through the server actions: previewAction when the section is in view, confirmAction with that
// preview's id on the click. The actions are mocked: this is the screen's side.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);

const { askEnroll, sendEnroll } = await import('./enroll');

const preview: ActionPreview = {
  kind: 'enroll-track', title: "Enroll T4's classes at assisted", summary: 'Opens a policy MR in acme-lab/belay-policy as kazdanm.',
  commands: [{ display: 'glab api --method PUT projects/9/repository/files/tier-state.yml', argv: ['api'], risk: 'policy' }],
  risk: 'policy', diff: ['+   ai-guardrail-acme-lab:', '+     guard.block: { tier: assisted }'], previewId: 'p1', mode: 'live', branch: 'belay/enroll-T4-2026-10-06',
};

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('the enroll round trip', () => {
  it('asks for an enroll-track intent and shows the preview, or the refusal, it answers with; nothing is confirmed', async () => {
    actions.previewAction.mockResolvedValueOnce({ status: 'preview', preview } satisfies ActionResponse);
    expect(await askEnroll('ledgerline', 'T4')).toEqual({ kind: 'preview', preview });
    expect(actions.previewAction).toHaveBeenCalledExactlyOnceWith({ kind: 'enroll-track', project: 'ledgerline', track: 'T4' });
    actions.previewAction.mockResolvedValueOnce({ status: 'refused', reason: 'T4 is already enrolled' });
    expect(await askEnroll('ledgerline', 'T4')).toEqual({ kind: 'refused', reason: 'T4 is already enrolled' });
    actions.previewAction.mockRejectedValueOnce(new Error('fetch failed'));
    expect(await askEnroll('ledgerline', 'T4')).toEqual({ kind: 'refused', reason: 'fetch failed' });
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('confirms by the preview id on screen, and sends nothing without one', async () => {
    actions.confirmAction.mockResolvedValue({ status: 'done', preview, results: [] } satisfies ActionResponse);
    await sendEnroll('ledgerline', 'T4', { kind: 'preview', preview });
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith({ kind: 'enroll-track', project: 'ledgerline', track: 'T4' }, 'p1');
    expect(await sendEnroll('ledgerline', 'T4', { kind: 'refused', reason: 'x' })).toBeNull();
    expect(await sendEnroll('ledgerline', 'T4', undefined)).toBeNull();
    expect(actions.confirmAction).toHaveBeenCalledTimes(1);
  });
});
