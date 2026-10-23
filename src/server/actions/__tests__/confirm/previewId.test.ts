// confirmAction takes `unknown`-grade input from the wire: a previewId that is not a string is refused with a reason that
// says so. It used to answer "live mode has not finished its first poll", which is false in demo and sends the operator
// to wait for a poll that has finished.
import { describe, expect, it, vi } from 'vitest';
import type { ActionDeps } from '../../run';
import { liveRig } from '../rig';

const at = vi.hoisted(() => ({ deps: null as ActionDeps | null }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'localhost:3000', origin: 'http://localhost:3000' }) }));
vi.mock('next/cache', () => ({ refresh: () => undefined }));
vi.mock('../../deps', async (real) => ({ ...(await real<object>()), actionDeps: () => at.deps }));

const { confirmAction } = await import('../../actions');

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };

describe('a confirm without a preview id', () => {
  for (const mode of ['live', 'demo'] as const) {
    it.each([[undefined], [null], [5], [{}]])(`in ${mode} mode, previewId %j is refused as a missing preview id, and nothing runs`, async (bad) => {
      const rig = await liveRig();
      at.deps = mode === 'live' ? rig.deps : { ...rig.deps, mode: 'demo', db: null };
      const r = await confirmAction(revoke, bad as unknown as string);
      expect(r).toMatchObject({ status: 'refused', reason: expect.stringMatching(/preview id/) });
      expect('reason' in r && r.reason).not.toMatch(/first poll/);
      expect(rig.gl.state.writes).toEqual([]);
    });
  }

  it('the real not-ready answer is unchanged: no deps yet', async () => {
    at.deps = null;
    expect(await confirmAction(revoke, 'f'.repeat(64))).toEqual({ status: 'refused', reason: 'live mode has not finished its first poll; try again in a moment' });
  });
});
