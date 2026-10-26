// Ask Afterlife reads the model strictly: a catalogue action that validates is kept, anything else is dropped and the reply
// kept; the call is the reflect profile at low effort from a temp dir, the turns bounded, and a missing claude is named.
import { describe, expect, it } from 'vitest';
import type { AgentCall, AgentOutcome } from '../../../../runner/agent/spawn';
import { ClaudeMissingError } from '../propose/propose';
import { answerOf, askAfterlife, MAX_TURN_CHARS, MAX_TURNS, snapshotOf, turnsOf } from './ask';

const STATE = { steps: [{ key: 'login', state: 'you', line: 'glab is not logged in' }], host: 'gitlab.com', groupId: '1', mode: 'demo', platform: 'windows' };
const outcome = (text: string, over: Partial<AgentOutcome> = {}): AgentOutcome =>
  ({ text, isError: false, costUsd: null, model: null, usage: null, sessionId: null, timedOut: false, exitCode: 0, stderr: '', ...over });

describe('answerOf', () => {
  it('keeps a catalogue action that validates', () => {
    expect(answerOf('{"reply":"Log in first.","action":{"kind":"glab-login"}}')).toEqual({ reply: 'Log in first.', action: { kind: 'glab-login' } });
    expect(answerOf('```json\n{"reply":"Save it.","action":{"kind":"save-project"}}\n```')).toEqual({ reply: 'Save it.', action: { kind: 'save-project' } });
    expect(answerOf('{"reply":"r","action":{"kind":"set-setup","groupId":"12","mode":"live"}}').action).toEqual({ kind: 'set-setup', groupId: '12', mode: 'live' });
  });

  it('drops an action outside the catalogue, or one that does not validate, and keeps the reply', () => {
    expect(answerOf('{"reply":"Run it.","action":{"kind":"shell","command":"rm -rf /"}}')).toEqual({ reply: 'Run it.' });
    expect(answerOf('{"reply":"Run it.","action":{"kind":"revoke-class","project":"x"}}')).toEqual({ reply: 'Run it.' });
    expect(answerOf('{"reply":"Set it.","action":{"kind":"set-setup","groupId":"acme; rm","mode":"live"}}')).toEqual({ reply: 'Set it.' });
    expect(answerOf('{"reply":"Login.","action":{"kind":"glab-login","host":"https://evil"}}')).toEqual({ reply: 'Login.' });
  });

  it('takes text with no JSON as the reply, bounded', () => {
    expect(answerOf('Just log in.')).toEqual({ reply: 'Just log in.' });
    expect(answerOf('x'.repeat(5000)).reply.length).toBe(600);
    expect(answerOf('{"action":{"kind":"install-glab"}}').reply).toMatch(/no answer/);
  });
});

describe('the bounds', () => {
  it('keeps the last 12 well-formed turns, each at most 2000 characters', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'afterlife' : 'you', text: `t${i}` }));
    expect(turnsOf(many).map((t) => t.text)).toEqual(many.slice(-MAX_TURNS).map((t) => t.text));
    expect(turnsOf([{ role: 'you', text: 'y'.repeat(3000) }, { role: 'system', text: 'x' }, 'x'])[0]?.text.length).toBe(MAX_TURN_CHARS);
    expect(turnsOf('nope')).toEqual([]);
  });

  it('keeps only the snapshot fields it knows, bounded', () => {
    expect(snapshotOf({ ...STATE, token: 'x', mode: 'weird', platform: 'beos' })).toEqual({ ...STATE, platform: 'linux' });
  });
});

describe('askAfterlife', () => {
  it('runs one reflect call at low effort from a temp dir and answers the validated reply', async () => {
    const calls: AgentCall[] = [];
    const a = await askAfterlife([{ role: 'you', text: 'what now?' }], STATE, async (c) => {
      calls.push(c);
      return outcome('{"reply":"Open the login window.","action":{"kind":"glab-login"},"extra":1}');
    });
    expect(a).toMatchObject({ reply: 'Open the login window.', action: { kind: 'glab-login' } });
    expect(typeof a.ms).toBe('number');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ model: 'claude-sonnet-5-5', effort: 'low', timeoutMs: 90_000, permissions: { step: 'reflect' } });
    expect(calls[0]?.cwd).toMatch(/afterlife-ask-/);
    expect(calls[0]?.prompt).toMatch(/Afterlife's setup guide[\s\S]*"glab is not logged in"[\s\S]*Person: what now\?/);
  });

  it('names a missing claude, a timeout and a failed call', async () => {
    await expect(askAfterlife([], STATE, async () => outcome('', { exitCode: 1, stderr: "'claude' is not recognized as an internal or external command" }))).rejects.toBeInstanceOf(ClaudeMissingError);
    await expect(askAfterlife([], STATE, async () => outcome('', { timedOut: true }))).rejects.toThrow(/within 90 s/);
    await expect(askAfterlife([], STATE, async () => outcome('', { exitCode: 2, stderr: 'boom\nmore' }))).rejects.toThrow('claude failed (exit 2): boom');
  });
});
