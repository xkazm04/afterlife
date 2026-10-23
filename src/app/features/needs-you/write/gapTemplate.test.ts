// A live gap's template MR goes through the server actions as a policy MR does: previewAction with the intent,
// confirmAction with the preview's id, and nothing at all without a preview on screen. The actions are mocked.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview, ApplyGapTemplate, PromoteClass } from '@/server/actions/types';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);

const { askLive, liveWriteName, sendLive } = await import('./live');

const gap: ApplyGapTemplate = { kind: 'apply-gap-template', project: 'ledgerline', stage: 'secure', from: null, to: 3, template: 'secure-includes', proposal: 'gap:ledgerline:secure' };
const policy: PromoteClass = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off', proposal: 'promote:ledgerline:qa.file-bug' };
const preview = {
  kind: 'apply-gap-template', title: 'Secure includes', summary: 's', risk: 'policy', diff: ['+ include: x'], previewId: 'p1', mode: 'live',
  commands: [{ display: 'glab mr create', argv: [], risk: 'policy' }],
} satisfies ActionPreview;

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('the live desk writes', () => {
  it('asks for a gap template by its intent, and a policy MR by its own', async () => {
    actions.previewAction.mockResolvedValue({ status: 'preview', preview });
    expect(await askLive(gap)).toEqual({ kind: 'preview', preview });
    await askLive(policy);
    expect(actions.previewAction.mock.calls).toEqual([[gap], [policy]]);
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('confirms the preview on screen by its id, and sends nothing without one', async () => {
    actions.confirmAction.mockResolvedValue({ status: 'refused', reason: 'no' });
    expect(await sendLive(gap, { kind: 'refused', reason: 'x' })).toBeNull();
    expect(actions.confirmAction).not.toHaveBeenCalled();
    await sendLive(gap, { kind: 'preview', preview });
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith(gap, 'p1');
  });

  it('names an unknown rung now as "?", never as R0', () => {
    expect(liveWriteName(gap)).toBe('secure-includes · secure R? → R3');
    expect(liveWriteName(policy)).toBe('qa.file-bug → Hands-off');
  });
});
