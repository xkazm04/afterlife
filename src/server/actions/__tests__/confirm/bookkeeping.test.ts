// A command GitLab ran is never reported as one that failed. If Belay's own record of it (commands_run) cannot be
// finished after GitLab answered, the confirm has no answer to give, and says so as no answer ("may or may not have run"),
// never as "Failed · command 1: <the index's error>. Nothing before it ran.", which reads as safe to send again.
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
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
