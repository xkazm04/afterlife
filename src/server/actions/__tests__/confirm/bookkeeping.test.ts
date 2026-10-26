// A command GitLab ran is never reported as one that failed. If Afterlife's own record of it (commands_run) cannot be
// finished after GitLab answered, the confirm has no answer to give, and says so as no answer ("may or may not have run"),
// never as "Failed · command 1: <the index's error>. Nothing before it ran.", which reads as safe to send again.
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import { confirmIntent, previewIntent } from '../../run';
import { liveRig } from '../rig';

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };

/** The same index, except that finishing a command as ok fails once (a full disk, a closed connection). */
function finishFailsOnce(db: PGlite): PGlite {
  let failed = false;
  return new Proxy(db, {
    get: (t, k, r) => {
      if (k !== 'query') return Reflect.get(t, k, r);
      return (sql: string, params?: unknown[]) => {
        if (!failed && sql.includes('update commands_run') && params?.[1] === 'ok') {
          failed = true;
          return Promise.reject(new Error('the index is closed'));
        }
        return t.query(sql, params);
      };
    },
  });
}

describe('a command that ran, whose record could not be finished', () => {
  it('is not answered as failed: the confirm has no answer, and the write ran once', async () => {
    const { gl, db, deps } = await liveRig();
    const p = await previewIntent(deps, revoke);
    if (p.status !== 'preview') throw new Error(p.status);
    const flaky = { ...deps, db: finishFailsOnce(db) };
    const r = confirmIntent(flaky, revoke, p.preview.previewId);
    await expect(r).rejects.toThrow('the index is closed');
    expect(gl.state.writes).toHaveLength(1);
  });
});

/** The same port, except that once `armed`, the second read of tier-state.yml (the confirm's read-back, after its plan's) fails. */
function readBackFails(armed: { on: boolean }) {
  let n = 0;
  return (port: GitLabPort): GitLabPort => new Proxy(port, {
    get: (t, k, r) => (k !== 'getFile' ? Reflect.get(t, k, r) : (...a: Parameters<GitLabPort['getFile']>) =>
      armed.on && a[1] === 'tier-state.yml' && ++n === 2 ? Promise.reject(new Error('read-back 503')) : t.getFile(...a)),
  });
}

describe('a write whose poll or read-back failed after GitLab answered', () => {
  it('still answers done, and the server log names each failure', async () => {
    const armed = { on: false };
    const { deps } = await liveRig(readBackFails(armed));
    const p = await previewIntent(deps, revoke);
    if (p.status !== 'preview') throw new Error(p.status);
    armed.on = true;
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const r = await confirmIntent({ ...deps, refresh: () => Promise.reject(new Error('poll 502')) }, revoke, p.preview.previewId);
      expect(r.status).toBe('done');
      const said = log.mock.calls.map((c) => c.map((x) => (x instanceof Error ? x.message : String(x))).join(' '));
      expect(said.filter((l) => l.startsWith('afterlife:') && l.includes('poll 502'))).toHaveLength(1);
      expect(said.filter((l) => l.startsWith('afterlife:') && l.includes('read-back 503'))).toHaveLength(1);
    } finally {
      log.mockRestore();
    }
  });
});
