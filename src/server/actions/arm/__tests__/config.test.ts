// T4 names no consumer id (F4): belay-apply's apply.json holds it, so Afterlife's environment neither reads nor carries one.
// AFTERLIFE_PROOF_AUTHORS is optional: only T3's tier-gate names it, and T3 refuses without it.
import { describe, expect, it } from 'vitest';
import { DEMO_PIN, readArmConfig } from '../config';

describe('the arm settings carry no consumer id', () => {
  it('ignores AFTERLIFE_GUARDRAIL_CONSUMER_ID and puts none in the pin', () => {
    const r = readArmConfig({ AFTERLIFE_PACK_VERSION: '1.0.0', AFTERLIFE_ENGINE_REF: 'v0.1.0', AFTERLIFE_GUARDRAIL_CONSUMER_ID: '4711' });
    expect(r).toEqual({ ok: true, pin: { packVersion: '1.0.0', engineRef: 'v0.1.0' } });
    expect(Object.keys(DEMO_PIN).sort()).toEqual(['engineRef', 'packVersion', 'proofAuthors']);
  });
});

describe('the proof authors T3 names', () => {
  const base = { AFTERLIFE_PACK_VERSION: '1.0.0', AFTERLIFE_ENGINE_REF: 'v0.1.0' };
  it('reads AFTERLIFE_PROOF_AUTHORS as the poller does, comma-separated, written back without spaces', () => {
    expect(readArmConfig({ ...base, AFTERLIFE_PROOF_AUTHORS: ' belay-bot , kazdanm ' })).toEqual({ ok: true, pin: { packVersion: '1.0.0', engineRef: 'v0.1.0', proofAuthors: 'belay-bot,kazdanm' } });
    expect(DEMO_PIN.proofAuthors).toBe('belay-bot'); // the example's value
  });
  it('refuses a value that is not a list of usernames, naming it', () => {
    expect(readArmConfig({ ...base, AFTERLIFE_PROOF_AUTHORS: 'belay-bot; rm -rf' })).toMatchObject({ ok: false, reason: expect.stringMatching(/AFTERLIFE_PROOF_AUTHORS/) });
  });
});
