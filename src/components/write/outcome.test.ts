import { describe, expect, it } from 'vitest';
import type { ActionPreview } from '@/server/actions/types';
import { elide, outcomeText, wentThrough } from './outcome';

const preview: ActionPreview = { kind: 'revoke-class', title: 'Revoke dep-bump.patch', summary: '', commands: [], risk: 'policy', diff: [], previewId: 'x', mode: 'demo' };
const res = (ok: boolean, simulated: boolean, display = 'glab api …') => ({ display, exit: ok ? 0 : 1, ok, simulated, ...(ok ? {} : { error: '403 Forbidden' }) });

describe('a write, in one line', () => {
  it('says a demo write was simulated and nothing executed', () => {
    expect(outcomeText({ status: 'done', preview, results: [res(true, true)] })).toBe('Revoke dep-bump.patch: 1 command planned, simulated in demo mode (nothing was executed)');
  });
  it('says a live write ran as you', () => {
    expect(outcomeText({ status: 'done', preview: { ...preview, mode: 'live' }, results: [res(true, false), res(true, false)] })).toBe('Revoke dep-bump.patch: done, 2 commands ran as you');
  });
  it('names the command that failed, and that the rest did not run', () => {
    expect(outcomeText({ status: 'failed', preview, results: [res(false, false, 'glab api PUT tier-state.yml')] })).toBe(
      'Revoke dep-bump.patch: failed at "glab api PUT tier-state.yml": 403 Forbidden. The rest did not run.',
    );
  });
  it('a refusal and a changed plan send nothing', () => {
    expect(outcomeText({ status: 'refused', reason: 'already hands_off' })).toBe('Not sent: already hands_off');
    expect(outcomeText({ status: 'changed', preview })).toMatch(/^Not sent: the plan changed/);
    expect(wentThrough({ status: 'changed', preview })).toBe(false);
  });
});

describe('a long command, folded for reading', () => {
  it('cuts only a long field value and says how much it left out', () => {
    const content = 'x'.repeat(300);
    const r = elide(`glab api --method PUT projects/1/repository/files/tier-state.yml -f branch=main -f content=${content}`);
    expect(r.elided).toBe(true);
    expect(r.text).toContain('-f branch=main');
    expect(r.text).toMatch(/-f content=x{64}… \(236 more characters\)$/);
    expect(elide('glab api --method PUT projects/1/issues/131 -f add_labels=x')).toEqual({ text: 'glab api --method PUT projects/1/issues/131 -f add_labels=x', elided: false });
  });
});
