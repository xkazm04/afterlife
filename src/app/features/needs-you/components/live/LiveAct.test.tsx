// Live Needs you acts on a promotion or a re-admit through the server door the desk uses: the server's preview (its
// commands and diff) is on screen before Run, and Run confirms that preview by its id. The actions are mocked.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NeedsYouItem } from '@/lib/demo';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { outcomeOf, type WriteView } from '@/server/actions/words';
import { liveIntent, writeName, type LiveAnswer } from '../../model/live';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);

const { askPolicyMr, sendPolicyMr } = await import('../../write/promote');
const { LiveAct } = await import('./LiveAct');

const promote: NeedsYouItem = {
  id: 'promote:ledgerline:code-fix.patch', kind: 'promote', title: 'Promote T1 patcher · code-fix.patch', from: 'assisted', to: 'supervised',
  rules: [['accepted outputs', '5 / 5', true], ['reverts', '0', true]], does: 'Opens a policy MR in belay-policy.',
};
const readmit: NeedsYouItem = { id: 'readmit:ledgerline:patch-bump', kind: 'readmit', title: 'Re-admit T8 gardener · patch-bump', does: 'Re-admits at Assisted at most.' };
const preview = {
  kind: 'promote-class', title: 'Promote code-fix.patch to supervised', summary: 'Opens a policy MR in acme-lab/belay-policy as @you.', risk: 'policy',
  diff: ['-     code-fix.patch: { tier: assisted }', '+     code-fix.patch: { tier: supervised }'], previewId: 'abc123', mode: 'live',
  commands: [{ display: 'glab api --method POST projects/90010002/repository/commits', argv: [], risk: 'policy' }, { display: 'glab mr create --title "Promote code-fix.patch"', argv: [], risk: 'policy' }],
} satisfies ActionPreview;

const html = (item: NeedsYouItem, view: WriteView | undefined, answer?: LiveAnswer) =>
  renderToStaticMarkup(<LiveAct item={item} intent={liveIntent(item, 'ledgerline')} view={view} answer={answer} sending={false} onRun={() => {}} onRetry={() => {}} />);

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('live Needs you: the write behind an item', () => {
  it('a promotion raises its class to the tier it asks for and settles its own ask; a re-admit goes to Assisted only', () => {
    expect(liveIntent(promote, 'ledgerline')).toEqual({ kind: 'promote-class', project: 'ledgerline', class: 'code-fix.patch', to: 'supervised', proposal: promote.id });
    expect(liveIntent(readmit, 'ledgerline')).toEqual({ kind: 'promote-class', project: 'ledgerline', class: 'patch-bump', to: 'assisted', proposal: readmit.id });
  });

  it('shows the server preview\'s commands and diff before Run, and Run confirms that preview\'s id', async () => {
    const intent = liveIntent(promote, 'ledgerline')!;
    expect(html(promote, undefined)).not.toContain('Run ·');
    actions.previewAction.mockResolvedValue({ status: 'preview', preview } satisfies ActionResponse);
    const view = await askPolicyMr(intent);
    expect(actions.previewAction).toHaveBeenCalledExactlyOnceWith(intent);
    const out = html(promote, view);
    for (const c of preview.commands) expect(out).toContain(c.display.replace(/"/g, '&quot;'));
    expect(out).toContain('code-fix.patch: { tier: supervised }');
    expect(out).toContain('Run · open the promotion MR');
    expect(out).toContain('5 / 5');
    expect(actions.confirmAction).not.toHaveBeenCalled();

    const done: ActionResponse = { status: 'done', preview, results: [{ display: 'd', exit: 0, ok: true, simulated: false, made: '!22' }] };
    actions.confirmAction.mockResolvedValue(done);
    expect(await sendPolicyMr(intent, view)).toBe(done);
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith(intent, 'abc123');
  });

  it('the answer says only what the response says: done names the MR GitLab opened, and Run is gone', () => {
    const intent = liveIntent(promote, 'ledgerline')!;
    const o = outcomeOf({ status: 'done', preview, results: [{ display: 'd', exit: 0, ok: true, simulated: false, made: '!22' }] }, writeName(intent));
    const out = html(promote, { kind: 'preview', preview }, { status: 'done', text: o!.text });
    expect(out).toContain('Done · code-fix.patch → Supervised · !22');
    expect(out).not.toContain('Run ·');
    const refused = outcomeOf({ status: 'refused', reason: 'code-fix.patch is already supervised' }, writeName(intent));
    expect(html(promote, { kind: 'refused', reason: 'code-fix.patch is already supervised' }, { status: 'refused', text: refused!.text })).toContain('Refused · code-fix.patch → Supervised');
  });

  it('a failed preview says why, offers to ask again, and has nothing to run', () => {
    const out = html(readmit, { kind: 'refused', reason: 'the server did not answer' });
    expect(out).toContain('the server did not answer');
    expect(out).toContain('Ask again');
    expect(out).not.toContain('Run ·');
  });

  it('a sign-off, a gap or a setup step sends nothing and says where to act', () => {
    for (const kind of ['signoff', 'gaps', 'setup']) {
      const item: NeedsYouItem = { id: `x-${kind}`, kind, title: 'Something · x', does: 'd' };
      expect(liveIntent(item, 'ledgerline')).toBeNull();
      expect(html(item, undefined)).toContain('Read-only here');
    }
  });
});
