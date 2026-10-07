// The Ladder's revoke goes through the server actions: previewAction when it comes into view, confirmAction with that
// preview's id on the click. The actions are mocked: this is the screen's side of the round trip.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);

const { askRevoke, revokeIntent, sendRevoke } = await import('./revoke');

const preview: ActionPreview = {
  kind: 'revoke-class', title: 'Revoke dep-bump.patch', summary: 'Commits tier-state.yml to acme-lab/belay-policy on main as kazdanm.',
  commands: [{ display: 'glab api --method PUT projects/90010002/repository/files/tier-state.yml -f branch=main', argv: ['api'], risk: 'policy' }],
  risk: 'policy', diff: ['-   dep-bump.patch: { tier: hands_off }', '+   dep-bump.patch: { tier: supervised }'], previewId: 'abc123', mode: 'live',
};
const intent = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('the revoke round trip', () => {
  it('asks for the write with a revoke-class intent, and shows the preview it answers with', async () => {
    actions.previewAction.mockResolvedValue({ status: 'preview', preview } satisfies ActionResponse);
    expect(await askRevoke('ledgerline', 'dep-bump.patch', 'supervised')).toEqual({ kind: 'preview', preview });
    expect(actions.previewAction).toHaveBeenCalledExactlyOnceWith(intent);
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('confirms the same intent with the id of the preview on screen', async () => {
    const done: ActionResponse = { status: 'done', preview, results: [{ display: preview.commands[0]!.display, exit: 0, ok: true, simulated: false, made: 'commit 1a2b3c4d' }] };
    actions.confirmAction.mockResolvedValue(done);
    expect(await sendRevoke('ledgerline', 'dep-bump.patch', 'supervised', { kind: 'preview', preview })).toBe(done);
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith(intent, 'abc123');
    expect(actions.previewAction).not.toHaveBeenCalled();
  });

  it('sends nothing without a preview on screen: still being asked, or refused', async () => {
    expect(await sendRevoke('ledgerline', 'dep-bump.patch', 'supervised', undefined)).toBeNull();
    expect(await sendRevoke('ledgerline', 'dep-bump.patch', 'supervised', { kind: 'refused', reason: 'no' })).toBeNull();
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('a refused preview, or a server that does not answer, is shown as the reason there is no write', async () => {
    actions.previewAction.mockResolvedValueOnce({ status: 'refused', reason: 'patch-bump is quarantined: Belay only lowers' });
    expect(await askRevoke('ledgerline', 'patch-bump', 'quarantined')).toEqual({ kind: 'refused', reason: 'patch-bump is quarantined: Belay only lowers' });
    actions.previewAction.mockRejectedValueOnce(new Error('fetch failed'));
    expect(await askRevoke('ledgerline', 'patch-bump', 'quarantined')).toEqual({ kind: 'refused', reason: 'fetch failed' });
  });

  it('the intent names one class and the tier it goes down to, nothing else', () => {
    expect(revokeIntent('ledgerline', 'qa.file-bug', 'assisted')).toEqual({ kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'qa.file-bug', to: 'assisted' }] });
  });
});
