// glue() runs the components' scripts for belay-apply's sweeps. Each child gets only the write token its call names (F71):
// the four Afterlife tokens are never inherited, under either name, so a script that writes with one cannot read another.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { glue, tokens } from '../lib.mjs';

// Two under the product's name, two under the pre-rename BELAY_ name a project's CI/CD settings may still carry.
const SET = { AFTERLIFE_BOT_TOKEN: 'bot', AFTERLIFE_LEDGER_TOKEN: 'ledger', BELAY_POLICY_TOKEN: 'policy', BELAY_DISPATCH_TOKEN: 'dispatch' };
const saved = {};
beforeAll(() => {
  for (const [k, v] of Object.entries({ ...SET, GITLAB_TOKEN: 'read' })) {
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
  it('a child sees none of the four tokens, under either name, unless its call names one, and then only that one', () => {
    expect(seen({})).toEqual({ GITLAB_TOKEN: 'read' });
    expect(seen(tokens('LEDGER_TOKEN'))).toEqual({ GITLAB_TOKEN: 'read', AFTERLIFE_LEDGER_TOKEN: 'ledger' });
    expect(seen({ GITLAB_TOKEN: 'dispatch' })).toEqual({ GITLAB_TOKEN: 'dispatch' });
  });

  it('hands a token set only under its BELAY_ name to the child as AFTERLIFE_', () => {
    expect(tokens('POLICY_TOKEN', 'BOT_TOKEN')).toEqual({ AFTERLIFE_POLICY_TOKEN: 'policy', AFTERLIFE_BOT_TOKEN: 'bot' });
    expect(tokens('NOT_A_TOKEN')).toEqual({});
  });
});
