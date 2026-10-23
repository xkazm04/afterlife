// A policy plan reads tier-state.yml once: the decision (who holds the class) and the edit (last_commit_id, the text
// the diff is made from) come from the same read, and a click costs GitLab one call fewer.
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import { liveRig } from '../../__tests__/rig';
import { previewIntent } from '../../run';

const INTENTS = {
  promote: { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' },
  revoke: { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'qa.file-bug', to: 'assisted' }], why: 'manual revoke' },
  enroll: { kind: 'enroll-track', project: 'ledgerline', track: 'T4' },
} as const;

/** The getFile paths a preview reads, through a port that records them. */
async function filesRead(intent: (typeof INTENTS)[keyof typeof INTENTS]): Promise<string[]> {
  const seen: string[] = [];
  const count = (port: GitLabPort): GitLabPort => new Proxy(port, {
    get: (t, k, r) => (k === 'getFile' ? (p: Parameters<GitLabPort['getFile']>[0], path: string, ref: string) => { seen.push(path); return t.getFile(p, path, ref); } : Reflect.get(t, k, r)),
  });
  const { deps } = await liveRig(count);
  seen.length = 0;
  await previewIntent(deps, intent);
  return seen.filter((p) => p === 'tier-state.yml' || p === 'trust-policy.yml');
}

describe('a policy plan reads each policy file once', () => {
  it.each(Object.keys(INTENTS) as (keyof typeof INTENTS)[])('%s', async (k) => {
    const read = await filesRead(INTENTS[k]);
    expect(read.filter((p) => p === 'tier-state.yml')).toHaveLength(1);
    expect(read.filter((p) => p === 'trust-policy.yml')).toHaveLength(1);
  });
});
