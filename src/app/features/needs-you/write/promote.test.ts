// Needs you's policy MRs go through the server actions: previewAction with a promote-class intent when the decision is
// in view, confirmAction with that preview's id on Run. The actions are mocked: this is the screen's side.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { pickNeedsYouDemo } from '../data/pick';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);

const { askPolicyMr, policyIntent, sendPolicyMr } = await import('./promote');

const demo = pickNeedsYouDemo();
const preview = {
  kind: 'promote-class', title: 'Promote patch-bump to assisted', summary: 's', risk: 'policy', diff: [], previewId: 'abc123', mode: 'demo',
  commands: [{ display: 'glab api --method PUT projects/90010002/repository/files/tier-state.yml', argv: [], risk: 'policy' }],
} satisfies ActionPreview;

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('the policy-MR intents', () => {
  it('n1 promotes the class it names to the tier it asks for, and settles n1', () => {
    expect(policyIntent('n1', demo)).toEqual({ kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off', proposal: 'n1' });
  });
  it('n4 re-admits its class at Assisted, never at its old tier, and settles n4', () => {
    expect(policyIntent('n4', demo)).toEqual({ kind: 'promote-class', project: 'ledgerline', class: 'patch-bump', to: 'assisted', proposal: 'n4' });
  });
});

describe('the round trip', () => {
  it('asks for the write with the promote-class intent and holds the preview it answers with', async () => {
    actions.previewAction.mockResolvedValue({ status: 'preview', preview } satisfies ActionResponse);
    expect(await askPolicyMr(policyIntent('n4', demo))).toEqual({ kind: 'preview', preview });
    expect(actions.previewAction).toHaveBeenCalledExactlyOnceWith(policyIntent('n4', demo));
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('Run confirms the same intent with the id of the preview on screen', async () => {
    const done: ActionResponse = { status: 'done', preview, results: [{ display: 'd', exit: 0, ok: true, simulated: true }] };
    actions.confirmAction.mockResolvedValue(done);
    expect(await sendPolicyMr(policyIntent('n4', demo), { kind: 'preview', preview })).toBe(done);
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith(policyIntent('n4', demo), 'abc123');
  });

  it('Run sends nothing without a preview on screen', async () => {
    expect(await sendPolicyMr(policyIntent('n1', demo), undefined)).toBeNull();
    expect(await sendPolicyMr(policyIntent('n1', demo), { kind: 'refused', reason: 'qa.file-bug is already hands_off' })).toBeNull();
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('a refusal is held as the reason there is no write', async () => {
    actions.previewAction.mockResolvedValue({ status: 'refused', reason: 'qa.file-bug is already hands_off: a promotion goes up' });
    expect(await askPolicyMr(policyIntent('n1', demo))).toEqual({ kind: 'refused', reason: 'qa.file-bug is already hands_off: a promotion goes up' });
  });
});
