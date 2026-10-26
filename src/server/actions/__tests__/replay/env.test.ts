// F93: demo mode (the hosted replay's `replay` too) plans against the seeded fake group, whose shape is fixed. It read the
// server's AFTERLIFE_* settings all the same, and a refusal named one to any caller: the operator's policy project name in
// "the group has no acme-lab/<name> project". The demo planner now reads no environment at all.
import { describe, expect, it } from 'vitest';
import { GROUP_ID } from '@/server/gitlab/fake/demo';
import { readPollerConfig } from '@/server/poller/config';
import { actionDeps } from '../../deps';
import { previewIntent } from '../../run';

const env = {
  AFTERLIFE_MODE: 'replay', AFTERLIFE_GROUP_ID: '999', AFTERLIFE_POLICY_PROJECT: 'operator-policy', AFTERLIFE_LEDGER_PROJECT: 'operator-ledger',
  AFTERLIFE_POLICY_REF: 'operator-ref', AFTERLIFE_AGENT_PREFIX: 'operator-bot-', AFTERLIFE_PROOF_AUTHORS: 'operator-proof',
  AFTERLIFE_PACK_VERSION: '9.9.9', AFTERLIFE_ENGINE_REF: 'operator-engine',
};
const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };

describe('the demo planner reads no environment', () => {
  it('plans against the fake group with its own settings, whatever AFTERLIFE_* the server has', () => {
    const deps = actionDeps(env);
    expect(deps).toMatchObject({ mode: 'demo', db: null, groupId: GROUP_ID });
    expect(deps?.cfg).toEqual(readPollerConfig(GROUP_ID, {}));
  });

  it('answers a preview without naming any of them', async () => {
    const r = await previewIntent(actionDeps(env)!, revoke);
    expect(r.status).toBe('preview');
    expect(JSON.stringify(r)).not.toMatch(/operator-|999|9\.9\.9/);
  });
});
