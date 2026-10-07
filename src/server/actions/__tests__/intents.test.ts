import { describe, expect, it } from 'vitest';
import { parseIntent } from '../intents';
import { confirmAction, previewAction } from '../actions';

const gap = {
  kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g2', stage: 'create', from: 2, to: 3, title: 'A gap', branch: 'belay/gap-g2',
  files: [{ path: 'CODEOWNERS', content: 'x\n' }],
};

describe('an intent is validated before it is planned', () => {
  it('accepts the four kinds', () => {
    for (const i of [
      { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] },
      { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off', proposal: 'n1' },
      { kind: 'mark-cra-ready', project: 'ledgerline', issue: 12 },
      gap,
    ]) expect(parseIntent(i).ok).toBe(true);
  });

  it('refuses what is not an intent, or not a known kind', () => {
    for (const bad of [null, 'revoke', [], {}, { kind: 'merge-everything', project: 'ledgerline' }, { kind: 'mark-cra-ready' }]) expect(parseIntent(bad).ok).toBe(false);
  });

  it('refuses a class, tier, project or issue that does not have the shape', () => {
    const rev = (changes: unknown, project = 'ledgerline') => parseIntent({ kind: 'revoke-class', project, changes });
    expect(rev([{ class: 'dep bump; rm -rf', to: 'assisted' }]).ok).toBe(false);
    expect(rev([{ class: 'dep-bump.patch', to: 'god_mode' }]).ok).toBe(false);
    expect(rev([{ class: 'a', to: 'assisted' }, { class: 'a', to: 'quarantined' }]).ok).toBe(false);
    expect(rev([]).ok).toBe(false);
    expect(rev([{ class: 'a', to: 'assisted' }], '../etc').ok).toBe(false);
    expect(parseIntent({ kind: 'mark-cra-ready', project: 'p', issue: -1 }).ok).toBe(false);
    expect(parseIntent({ kind: 'mark-cra-ready', project: 'p', issue: 1.5 }).ok).toBe(false);
    expect(parseIntent({ kind: 'revoke-class', project: 'p', changes: [{ class: 'a', to: 'assisted' }], why: 'two\nlines' }).ok).toBe(false);
  });

  it('keeps a gap’s branch under belay/ and its files inside the repository', () => {
    const bad = (over: Record<string, unknown>) => parseIntent({ ...gap, ...over }).ok;
    expect(bad({})).toBe(true);
    expect(bad({ branch: 'main' })).toBe(false);
    expect(bad({ branch: 'belay/../main' })).toBe(false);
    expect(bad({ files: [{ path: '../.ssh/authorized_keys', content: 'x' }] })).toBe(false);
    expect(bad({ files: [{ path: '/etc/passwd', content: 'x' }] })).toBe(false);
    expect(bad({ files: [{ path: 'a/../../b', content: 'x' }] })).toBe(false);
    expect(bad({ files: [{ path: 'a', content: 'x' }, { path: 'a', content: 'y' }] })).toBe(false);
    expect(bad({ files: [{ path: 'big', content: 'x'.repeat(70_000) }] })).toBe(false);
    expect(bad({ files: [] })).toBe(false);
    expect(bad({ stage: 'nonsense' })).toBe(false);
    expect(bad({ from: 9 })).toBe(false);
  });

  it('takes an arm or a disarm of one track, T1 to T8, and nothing else from it', () => {
    for (const kind of ['arm-track', 'disarm-track']) {
      const r = parseIntent({ kind, project: 'ledgerline', track: 'T4', branch: 'main', content: 'x', token: 'secret' });
      expect(r.ok && r.intent).toEqual({ kind, project: 'ledgerline', track: 'T4' });
      for (const track of [undefined, 'T0', 'T9', 't4', 'T4 ', 'T44', 4, 'guardrail']) expect(parseIntent({ kind, project: 'ledgerline', track }).ok).toBe(false);
      expect(parseIntent({ kind, project: '../x', track: 'T4' }).ok).toBe(false);
    }
  });

  it('drops fields it does not know instead of passing them on', () => {
    const r = parseIntent({ kind: 'mark-cra-ready', project: 'ledgerline', issue: 3, argv: ['rm', '-rf'], token: 'secret' });
    expect(r.ok && Object.keys(r.intent).sort()).toEqual(['issue', 'kind', 'project']);
  });
});

describe('the server actions (demo mode, the default)', () => {
  const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };

  it('preview, then confirm with its id: a simulated result, nothing executed', async () => {
    const p = await previewAction(revoke);
    expect(p.status).toBe('preview');
    if (p.status !== 'preview') return;
    expect(p.preview.mode).toBe('demo');
    const r = await confirmAction(revoke, p.preview.previewId);
    expect(r).toMatchObject({ status: 'done', results: [{ simulated: true, ok: true }] });
  });

  it('previews the T4 arm MR in demo mode from the demo group, and confirms it only as a simulation', async () => {
    const arm = { kind: 'arm-track', project: 'ledgerline', track: 'T4' };
    expect(await previewAction(arm)).toMatchObject({ status: 'refused', reason: expect.stringContaining('T4 is already armed') });
    const disarm = { kind: 'disarm-track', project: 'ledgerline', track: 'T4' };
    const p = await previewAction(disarm);
    if (p.status !== 'preview') throw new Error(p.status);
    expect(p.preview).toMatchObject({ mode: 'demo', branch: 'belay/disarm-guardrail' });
    expect(await confirmAction(disarm, p.preview.previewId)).toMatchObject({ status: 'done', results: [{ simulated: true }, { simulated: true }] });
  });

  it('refuses a bad intent and a bad preview id', async () => {
    expect(await previewAction({ kind: 'nope' })).toMatchObject({ status: 'refused' });
    expect(await confirmAction(revoke, 'x'.repeat(64))).toMatchObject({ status: 'changed' });
  });

  it('live mode before its first poll refuses instead of guessing', async () => {
    const before = process.env.BELAY_MODE;
    process.env.BELAY_MODE = 'live';
    try {
      expect(await previewAction(revoke)).toMatchObject({ status: 'refused', reason: expect.stringContaining('first poll') });
    } finally {
      if (before === undefined) delete process.env.BELAY_MODE;
      else process.env.BELAY_MODE = before;
    }
  });
});
