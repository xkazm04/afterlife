// The setup intents' parser refuses anything that is not its exact shape, and the gate answers only this machine, in
// demo mode too, never the hosted replay.
import { describe, expect, it } from 'vitest';
import { asSetupWrite, parseSetupIntent, setupAway } from '../intents';

const h = (host: string) => new Headers({ host });

describe('parseSetupIntent', () => {
  it('keeps the valid shapes, cleaned', () => {
    expect(parseSetupIntent({ kind: 'install-glab', extra: 1 })).toEqual({ ok: true, intent: { kind: 'install-glab' } });
    expect(parseSetupIntent({ kind: 'glab-login' })).toEqual({ ok: true, intent: { kind: 'glab-login' } });
    expect(parseSetupIntent({ kind: 'glab-login', host: 'GitLab.com' })).toEqual({ ok: true, intent: { kind: 'glab-login' } });
    expect(parseSetupIntent({ kind: 'glab-login', host: 'Git.Example.com' })).toEqual({ ok: true, intent: { kind: 'glab-login', host: 'git.example.com' } });
    expect(parseSetupIntent({ kind: 'set-setup', groupId: ' 123 ', mode: 'live', project: 'api', proofAuthors: 'op, op.two' })).toEqual({
      ok: true, intent: { kind: 'set-setup', groupId: '123', mode: 'live', project: 'api', proofAuthors: 'op,op.two' },
    });
  });

  it('refuses every value that could reach a command line or a setting in another shape', () => {
    for (const host of ['https://git.example.com', 'git.example.com:8443', 'a b', 'x;rm -rf', '-oProxy', '']) {
      expect(parseSetupIntent({ kind: 'glab-login', host }).ok, host).toBe(false);
    }
    const ok = { kind: 'set-setup', groupId: '1', mode: 'live' };
    for (const bad of [{ groupId: 'acme/team' }, { groupId: 12 }, { mode: 'replay' }, { host: 'http://x' }, { project: 'acme/api' }, { proofAuthors: 'a b' }, { proofAuthors: 'op,' }]) {
      expect(parseSetupIntent({ ...ok, ...bad }).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(parseSetupIntent({ kind: 'rm-rf' })).toMatchObject({ ok: false, reason: expect.stringMatching(/unknown setup kind/) });
    expect(parseSetupIntent([])).toMatchObject({ ok: false });
  });

  it('asSetupWrite takes only the setup kinds and answers a bad one with a refusal', () => {
    expect(asSetupWrite({ kind: 'revoke-class' })).toBeNull();
    expect(asSetupWrite('install-glab')).toBeNull();
    expect(asSetupWrite({ kind: 'set-setup', groupId: 'x', mode: 'live' })).toMatchObject({ ok: false, response: { status: 'refused' } });
  });
});

describe('setupAway', () => {
  it('answers this machine in demo and live, and refuses another host and the hosted replay', () => {
    expect(setupAway(h('localhost:3000'), {})).toBeNull();
    expect(setupAway(h('127.0.0.1:3000'), { BELAY_MODE: 'live' })).toBeNull();
    expect(setupAway(h('evil.example'), {})).toMatchObject({ status: 'refused', reason: expect.stringMatching(/not localhost/) });
    expect(setupAway(h('localhost:3000'), { AFTERLIFE_MODE: 'replay' })).toMatchObject({ status: 'refused' });
  });
});
