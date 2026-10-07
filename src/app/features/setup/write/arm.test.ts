// Setup's arm and disarm go through the server actions: previewAction when the section is in view, confirmAction with that
// preview's id on the click, verifyArmAction on "I merged it · verify". The actions are mocked: this is the screen's side.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
const verify = vi.hoisted(() => ({ verifyArmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);
vi.mock('@/server/actions/arm/verifyAction', () => verify);

const { armIntent, askArm, checkArm, sendArm } = await import('./arm');

const preview: ActionPreview = {
  kind: 'arm-track', title: 'Arm T4 guardrail: block what it can quote', summary: 'Opens one MR in acme-lab/core-banking/ledgerline as kazdanm.',
  commands: [{ display: 'glab api --method PUT projects/90010001/repository/files/.gitlab-ci.yml -f branch=belay/arm-guardrail', argv: ['api'], risk: 'low' }],
  risk: 'low', diff: ['@@ .gitlab-ci.yml · after line 9', '+   - component: x'], previewId: 'abc123', mode: 'live', branch: 'belay/arm-guardrail', notes: ['n1'],
};

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
  verify.verifyArmAction.mockReset();
});

describe('the arm round trip', () => {
  it('asks for an arm-track (or disarm-track) intent and shows the preview it answers with; nothing is confirmed', async () => {
    actions.previewAction.mockResolvedValue({ status: 'preview', preview } satisfies ActionResponse);
    expect(await askArm('ledgerline', 'T4', false)).toEqual({ kind: 'preview', preview });
    expect(actions.previewAction).toHaveBeenCalledExactlyOnceWith({ kind: 'arm-track', project: 'ledgerline', track: 'T4' });
    await askArm('ledgerline', 'T4', true);
    expect(actions.previewAction).toHaveBeenLastCalledWith({ kind: 'disarm-track', project: 'ledgerline', track: 'T4' });
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });

  it('shows a refusal as the reason, and an unreachable server as one too', async () => {
    actions.previewAction.mockResolvedValueOnce({ status: 'refused', reason: "the repo does not define T3's arm content yet" });
    expect(await askArm('ledgerline', 'T3', false)).toEqual({ kind: 'refused', reason: "the repo does not define T3's arm content yet" });
    actions.previewAction.mockRejectedValueOnce(new Error('fetch failed'));
    expect(await askArm('ledgerline', 'T4', false)).toEqual({ kind: 'refused', reason: 'fetch failed' });
  });

  it('confirms the same intent with the id of the preview on screen, and nothing without one', async () => {
    const done: ActionResponse = { status: 'done', preview, results: [{ display: 'x', exit: 0, ok: true, simulated: false, made: '!22', url: 'https://gitlab.com/x/-/merge_requests/22' }] };
    actions.confirmAction.mockResolvedValue(done);
    expect(await sendArm('ledgerline', 'T4', false, { kind: 'preview', preview })).toBe(done);
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith(armIntent('ledgerline', 'T4', false), 'abc123');
    expect(await sendArm('ledgerline', 'T4', false, undefined)).toBeNull();
    expect(await sendArm('ledgerline', 'T4', false, { kind: 'refused', reason: 'no' })).toBeNull();
    expect(actions.confirmAction).toHaveBeenCalledTimes(1);
  });

  it('verify asks the read, and a server that does not answer is a refusal, never an armed track', async () => {
    verify.verifyArmAction.mockResolvedValueOnce({ status: 'read', armed: true, text: 'on main' });
    expect(await checkArm('ledgerline', 'T4', false)).toEqual({ status: 'read', armed: true, text: 'on main' });
    expect(verify.verifyArmAction).toHaveBeenCalledWith({ kind: 'arm-track', project: 'ledgerline', track: 'T4' });
    verify.verifyArmAction.mockRejectedValueOnce(new Error('fetch failed'));
    expect(await checkArm('ledgerline', 'T4', true)).toEqual({ status: 'refused', reason: 'fetch failed' });
  });
});
