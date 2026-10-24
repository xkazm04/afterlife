import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGlabAdapter } from '../../adapter/glabAdapter';
import type { ExecFn } from '../../adapter/exec';

const planned = { argv: ['api', '--method', 'POST', 'projects/1/merge_requests', '-f', 'title=t'], display: 'glab api POST projects/1/merge_requests', risk: 'low' as const };
const portAnswering = (stdout: string) => createGlabAdapter({ bin: 'glab', exec: (async () => ({ code: 0, stdout, stderr: '' })) as ExecFn });

describe('execute: a write whose answer is not JSON', () => {
  afterEach(() => vi.restoreAllMocks());

  it('still succeeds with no body, and says on the server log that the answer could not be read', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await portAnswering('<html>proxy page</html>').execute(planned);
    expect(r).toMatchObject({ ok: true, body: null });
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0]?.[0])).toContain(planned.display);
  });

  it('logs nothing for an empty answer or JSON', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect((await portAnswering('').execute(planned)).body).toBeNull();
    expect((await portAnswering('{"iid":3}').execute(planned)).body).toEqual({ iid: 3 });
    expect(log).not.toHaveBeenCalled();
  });
});
