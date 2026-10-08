// glue() runs the components' scripts for belay-apply's sweeps. Each child gets only the write token its call names (F71):
// the four Belay tokens are never inherited, so a script that writes with one cannot read another.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { glue } from './lib.mjs';

const TOKENS = { BELAY_BOT_TOKEN: 'bot', BELAY_POLICY_TOKEN: 'policy', BELAY_LEDGER_TOKEN: 'ledger', BELAY_DISPATCH_TOKEN: 'dispatch' };
const saved = {};
beforeAll(() => {
  for (const [k, v] of Object.entries({ ...TOKENS, GITLAB_TOKEN: 'read' })) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
});
afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const seen = (env) => {
  const r = glue('testing/print-env.mjs', [], env);
  expect(r.code).toBe(0);
  return JSON.parse(r.stdout);
};

describe('glue (F71)', () => {
  it('a child sees none of the four Belay tokens unless its call names one, and then only that one', () => {
    expect(seen({})).toEqual({ GITLAB_TOKEN: 'read' });
    expect(seen({ BELAY_LEDGER_TOKEN: process.env.BELAY_LEDGER_TOKEN })).toEqual({ GITLAB_TOKEN: 'read', BELAY_LEDGER_TOKEN: 'ledger' });
    expect(seen({ GITLAB_TOKEN: process.env.BELAY_DISPATCH_TOKEN })).toEqual({ GITLAB_TOKEN: 'dispatch' });
  });
});
