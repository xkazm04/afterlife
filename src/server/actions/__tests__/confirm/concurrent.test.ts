// A double click or two tabs confirm one preview twice at once. One confirm runs; the other is refused as already running, and
// the slot is free again afterwards (also when the run throws), so a later retry is not locked out.
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import { listCommands } from '@/server/index/repositories/commandsRun';
import { confirmIntent, previewIntent } from '../../run';
import { liveRig } from '../rig';

const intents = {
  revoke: { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] },
  promote: { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' },
};

/** The same port, except that every execute waits a tick, so a second confirm arrives while the first is still running. */
function slow(counter: { n: number }) {
  return (port: GitLabPort): GitLabPort =>
    new Proxy(port, {
      get: (t, k, r) => (k === 'execute' ? async (c: Parameters<GitLabPort['execute']>[0]) => { counter.n++; await new Promise((ok) => setTimeout(ok, 20)); return t.execute(c); } : Reflect.get(t, k, r)),
    });
}

describe('two concurrent confirms of one preview', () => {
  for (const name of ['revoke', 'promote'] as const) {
    it(`${name}: the plan executes once, one row per command, and the second answer is refused`, async () => {
      const counter = { n: 0 };
      const { deps, db } = await liveRig(slow(counter));
      const p = await previewIntent(deps, intents[name]);
      if (p.status !== 'preview') throw new Error(p.status === 'refused' ? p.reason : p.status);
      const planned = p.preview.commands.length;
      const [a, b] = await Promise.all([confirmIntent(deps, intents[name], p.preview.previewId), confirmIntent(deps, intents[name], p.preview.previewId)]);
      const answers = [a, b];
      expect(answers.filter((r) => r.status === 'done')).toHaveLength(1);
      expect(answers.filter((r) => r.status === 'refused' && /still running/.test(r.reason))).toHaveLength(1);
      expect(counter.n).toBe(planned);
      expect(await listCommands(db, 'ledgerline')).toHaveLength(planned);
    });
  }

  it('the slot is released when the run fails: the same preview can be confirmed again', async () => {
    const { deps } = await liveRig((port) => new Proxy(port, { get: (t, k, r) => (k === 'execute' ? () => Promise.reject(new Error('boom')) : Reflect.get(t, k, r)) }));
    const p = await previewIntent(deps, intents.revoke);
    if (p.status !== 'preview') throw new Error(p.status);
    expect((await confirmIntent(deps, intents.revoke, p.preview.previewId)).status).toBe('failed');
    expect((await confirmIntent(deps, intents.revoke, p.preview.previewId)).status).toBe('failed');
  });
});
