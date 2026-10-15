// The Ladder's promotion goes through the server actions, as Needs you's does: previewAction when an eligible (or
// quarantined) class is in view, confirmAction with that preview's id on p. The actions are mocked: the screen's side.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);

const { askPromote, promoteIntent, sendPromote } = await import('./promote');

const preview: ActionPreview = {
  kind: 'promote-class', title: 'Promote qa.file-bug to hands_off', summary: 'Opens a policy MR in acme-lab/belay-policy as kazdanm.',
  commands: [{ display: 'glab api --method PUT projects/90010002/repository/files/tier-state.yml', argv: ['api'], risk: 'policy' }],
  risk: 'policy', diff: ['+     qa.file-bug: { tier: hands_off, lease_expires: "2026-10-20T14:22:00.000Z" }'], previewId: 'abc123', mode: 'live',
};

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('the promote intent', () => {
  it('names the class and the tier it goes up to, and the live ask it settles only when one is open', () => {
    expect(promoteIntent('ledgerline', 'qa.file-bug', 'hands_off')).toEqual({ kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' });
    expect(promoteIntent('ledgerline', 'qa.file-bug', 'hands_off', 'promote:ledgerline:qa.file-bug')).toEqual({
      kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off', proposal: 'promote:ledgerline:qa.file-bug',
    });
  });
});

describe('the promote round trip', () => {
  const intent = promoteIntent('ledgerline', 'qa.file-bug', 'hands_off');

  it('asks for the write with the promote-class intent, and holds the preview it answers with', async () => {
    actions.previewAction.mockResolvedValue({ status: 'preview', preview } satisfies ActionResponse);
    expect(await askPromote(intent)).toEqual({ kind: 'preview', preview });
    expect(actions.previewAction).toHaveBeenCalledExactlyOnceWith(intent);
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('p confirms the same intent with the id of the preview on screen', async () => {
    const done: ActionResponse = { status: 'done', preview, results: [{ display: 'd', exit: 0, ok: true, simulated: false, made: '!22', url: 'https://gitlab.com/acme-lab/belay-policy/-/merge_requests/22' }] };
    actions.confirmAction.mockResolvedValue(done);
    expect(await sendPromote(intent, { kind: 'preview', preview })).toBe(done);
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith(intent, 'abc123');
  });

  it('sends nothing without a preview on screen: still asked, refused, or already sent', async () => {
    expect(await sendPromote(intent, undefined)).toBeNull();
    expect(await sendPromote(intent, { kind: 'refused', reason: 'qa.file-bug is in its cooldown' })).toBeNull();
    expect(await sendPromote(intent, { kind: 'sent', mr: '!22', url: null, simulated: false })).toBeNull();
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('a refusal, or a server that does not answer, is held as the reason there is no write', async () => {
    actions.previewAction.mockResolvedValueOnce({ status: 'refused', reason: 'qa.file-bug is already hands_off: a promotion goes up' });
    expect(await askPromote(intent)).toEqual({ kind: 'refused', reason: 'qa.file-bug is already hands_off: a promotion goes up' });
    actions.previewAction.mockRejectedValueOnce(new Error('fetch failed'));
    expect(await askPromote(intent)).toEqual({ kind: 'refused', reason: 'fetch failed' });
  });
});
