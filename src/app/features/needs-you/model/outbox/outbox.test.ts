import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import type { ActionPreview } from '@/server/actions/types';
import type { OutItem } from '../types';
import { buildOutItem, stageItem, unstageItem } from './outbox';

const demo = pickNeedsYouDemo();
const preview = { mode: 'live', summary: 'Opens a policy MR in acme-lab/belay-policy as kazdanm.', commands: [{ display: 'glab api --method PUT projects/2/repository/files/tier-state.yml' }, { display: 'glab api --method POST projects/2/merge_requests' }], diff: ['-     qa.file-bug: { tier: supervised }', '+     qa.file-bug: { tier: hands_off }'] } as unknown as ActionPreview;
const item = (key: string, clock = false): OutItem => ({ key, kind: 'k', title: key, ref: key, commands: ['c'], clock });

describe('outbox list', () => {
  it('appends in staging order', () => {
    const out = stageItem(stageItem([], item('a')), item('b'));
    expect(out.map((o) => o.key)).toEqual(['a', 'b']);
  });
  it('keeps the legal clock first in line, and the rest in order', () => {
    const out = [item('a'), item('b'), item('clock', true), item('c')].reduce<readonly OutItem[]>((acc, i) => stageItem(acc, i), []);
    expect(out.map((o) => o.key)).toEqual(['clock', 'a', 'b', 'c']);
  });
  it('staging the same key again replaces it instead of duplicating', () => {
    const out = stageItem(stageItem([], item('a')), { ...item('a'), title: 'again' });
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('again');
  });
  it('unstage removes only that key, and a missing key changes nothing', () => {
    const out = [item('a'), item('b')];
    expect(unstageItem(out, 'a').map((o) => o.key)).toEqual(['b']);
    expect(unstageItem(out, 'zzz')).toHaveLength(2);
  });
});

describe('what each decision stages', () => {
  it('the CRA sign-off is a clock item with its two commands and no diff', () => {
    const o = buildOutItem('n2', demo);
    expect(o).toMatchObject({ key: 'n2', clock: true, ref: 'ledgerline#131' });
    expect(o?.commands).toHaveLength(2);
    expect(o?.diff).toBeUndefined();
  });
  it('a promotion or a re-admission carries the server’s commands and diff, exactly as planned', () => {
    const o = buildOutItem('n1', demo, { n1: { kind: 'preview', preview } });
    expect(o).toMatchObject({ kind: 'policy MR', title: 'Promote dep-bump.patch to Hands-off', file: 'belay-policy · tier-state.yml', note: preview.summary });
    expect(o?.commands).toEqual(preview.commands.map((c) => c.display));
    expect(o?.diff).toEqual([['-', '    qa.file-bug: { tier: supervised }'], ['+', '    qa.file-bug: { tier: hands_off }']]);
    expect(buildOutItem('n4', demo, { n4: { kind: 'preview', preview } })?.title).toBe('Re-admit patch-bump as Assisted');
  });
  it('before the server answered, or when it refused, there is nothing to run and the note says why', () => {
    expect(buildOutItem('n1', demo)).toMatchObject({ commands: [], note: 'Asking Belay for the exact write…' });
    expect(buildOutItem('n1', demo)?.diff).toBeUndefined();
    const refused = buildOutItem('n1', demo, { n1: { kind: 'refused', reason: 'dep-bump.patch is already hands_off: a promotion goes up' } });
    expect(refused).toMatchObject({ commands: [], note: 'Belay refuses this write: dep-bump.patch is already hands_off: a promotion goes up. Nothing can run.' });
  });
  it('a demo preview says Run only simulates', () => {
    expect(buildOutItem('n4', demo, { n4: { kind: 'preview', preview: { ...preview, mode: 'demo' } } })?.note).toBe('Demo: Run simulates this write; nothing is sent to GitLab.');
  });
  it('a gap stages its draft MR with no command of its own, and the probe stages nothing', () => {
    expect(buildOutItem('g1', demo)).toMatchObject({ kind: 'gap MR', commands: [], note: 'Asking Belay for the exact write…' });
    expect(buildOutItem('g4', demo)).toBeNull();
  });
  it('stages nothing for a row that has no write', () => {
    expect(buildOutItem('n5', demo)).toBeNull();
  });
});
