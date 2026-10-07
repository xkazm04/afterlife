// A screen words an action's answer with only what the answer says.
import { describe, expect, it } from 'vitest';
import type { ActionPreview, CommandOutcome } from '../types';
import { commandLines, commitOf, mrOf, outcomeOf } from '../words';

const preview: ActionPreview = {
  kind: 'promote-class', title: 'Promote x', summary: 's', risk: 'policy', diff: [], previewId: 'p', mode: 'live',
  commands: [
    { display: 'glab api --method PUT projects/2/repository/files/tier-state.yml -f branch=belay/promote-x', argv: [], risk: 'policy' },
    { display: 'glab api --method POST projects/2/merge_requests -f title=x', argv: [], risk: 'low' },
  ],
};
const ran = (o: Partial<CommandOutcome>): CommandOutcome => ({ display: 'd', exit: 0, ok: true, simulated: false, ...o });

describe('outcomeOf', () => {
  it('a demo done is simulated and says nothing was sent, never that it was pushed', () => {
    const o = outcomeOf({ status: 'done', preview: { ...preview, mode: 'demo' }, results: [ran({ simulated: true }), ran({ simulated: true })] }, 'x → Hands-off');
    expect(o).toMatchObject({ status: 'done', simulated: true, made: [] });
    expect(o?.text).toBe('Simulated · x → Hands-off · demo mode: nothing was sent to GitLab');
    expect(o?.text).not.toMatch(/pushed|as you/);
  });

  it('a live done names the commit and the MR GitLab made, from the results', () => {
    const results = [ran({ made: 'commit 1a2b3c4d' }), ran({ made: '!22', url: 'https://gitlab.com/acme/belay-policy/-/merge_requests/22' })];
    const o = outcomeOf({ status: 'done', preview, results }, 'x → Hands-off');
    expect(o).toMatchObject({ status: 'done', simulated: false, made: ['commit 1a2b3c4d', '!22'], text: 'Done · x → Hands-off · commit 1a2b3c4d · !22' });
    expect([commitOf(results), mrOf(results)]).toEqual(['1a2b3c4d', '!22']);
  });

  it('a live done with nothing named says so instead of inventing an id', () => {
    expect(outcomeOf({ status: 'done', preview, results: [ran({}), ran({})] }, 'x')?.text).toBe('Done · x · 2 command(s) ran; GitLab named nothing');
  });

  it('failed says which command failed, with GitLab’s answer, and what ran before it', () => {
    const o = outcomeOf({ status: 'failed', preview, results: [ran({ made: 'commit 1a2b' }), ran({ ok: false, exit: 403, error: '403 Forbidden' })] }, 'x');
    expect(o?.text).toBe('Failed · x · command 2 of 2: 403 Forbidden (exit 403). 1 command(s) before it ran.');
    expect(outcomeOf({ status: 'failed', preview, results: [ran({ ok: false, exit: 400, error: 'file changed' })] }, 'x')?.text).toMatch(/command 1 of 2: file changed \(exit 400\)\. Nothing before it ran\.$/);
  });

  it('changed carries the new preview and says nothing ran; refused gives the reason', () => {
    const next = { ...preview, previewId: 'q' };
    expect(outcomeOf({ status: 'changed', preview: next }, 'x')).toMatchObject({ status: 'changed', preview: next, text: expect.stringMatching(/nothing ran/) });
    expect(outcomeOf({ status: 'refused', reason: 'x is already hands_off' }, 'x')).toEqual({ status: 'refused', reason: 'x is already hands_off', text: 'Refused · x · x is already hands_off. Nothing ran.' });
  });

  it('a preview is not an outcome, and a command block shows each display line', () => {
    expect(outcomeOf({ status: 'preview', preview }, 'x')).toBeNull();
    expect(commandLines(preview)).toEqual(preview.commands.map((c) => c.display));
  });
});
