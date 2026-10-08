// T4 names no consumer id (F4): belay-apply's apply.json holds it, so Belay's environment neither reads nor carries one.
import { describe, expect, it } from 'vitest';
import { DEMO_PIN, readArmConfig } from '../config';

describe('the arm settings carry no consumer id', () => {
  it('ignores BELAY_GUARDRAIL_CONSUMER_ID and puts none in the pin', () => {
    const r = readArmConfig({ BELAY_PACK_VERSION: '1.0.0', BELAY_ENGINE_REF: 'v0.1.0', BELAY_GUARDRAIL_CONSUMER_ID: '4711' });
    expect(r).toEqual({ ok: true, pin: { packVersion: '1.0.0', engineRef: 'v0.1.0' } });
    expect(Object.keys(DEMO_PIN).sort()).toEqual(['engineRef', 'packVersion']);
  });
});
