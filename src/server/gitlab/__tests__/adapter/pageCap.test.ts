import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlabClient } from '../../adapter/client';
import type { ExecFn } from '../../adapter/exec';

/** A list of `n` rows served `per_page` at a time, like GitLab. */
const serving = (n: number): ExecFn => async (_bin, args) => {
  const q = new URLSearchParams((args.at(-1) ?? '').split('?')[1] ?? '');
  const per = Number(q.get('per_page'));
  const page = Number(q.get('page'));
  const rows = Array.from({ length: n }, (_, i) => ({ id: i + 1 })).slice((page - 1) * per, page * per);
  return { code: 0, stdout: JSON.stringify(rows), stderr: '' };
};

describe('getPages at maxPages', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says on the server log when the walk stopped on a full page, so a cut list is not silent', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const c = new GlabClient({ bin: 'glab', exec: serving(5), pageSize: 2, maxPages: 2 });
    expect(await c.getPages('projects/1/repository/tree')).toHaveLength(4);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0]?.[0])).toContain('projects/1/repository/tree');
  });

  it('logs nothing when the list ended inside the cap, or a limit was met', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await new GlabClient({ bin: 'glab', exec: serving(3), pageSize: 2, maxPages: 2 }).getPages('p')).toHaveLength(3);
    expect(await new GlabClient({ bin: 'glab', exec: serving(9), pageSize: 2, maxPages: 2 }).getPages('p', {}, 4)).toHaveLength(4);
    expect(log).not.toHaveBeenCalled();
  });
});
