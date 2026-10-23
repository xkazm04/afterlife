import { describe, expect, it } from 'vitest';
import type { ExecFn, ExecResult } from '../../adapter/exec';
import { isKind } from '../../errors';
import { createGlabAdapter } from '../../adapter/glabAdapter';

const okJson = (v: unknown): ExecResult => ({ code: 0, stdout: JSON.stringify(v), stderr: '' });
const pipeline = (id: number) => ({ id, project_id: 1, status: 'success', ref: 'main', sha: 'abc', created_at: 't', updated_at: 't' });

function adapter(queue: ExecResult[], extra: { pageSize?: number } = {}, calls: string[][] = []) {
  const exec: ExecFn = async (_f, args) => {
    calls.push([...args]);
    const next = queue.shift();
    if (!next) throw new Error('exec called more often than scripted');
    return next;
  };
  return createGlabAdapter({ bin: 'glab', exec, sleep: async () => {}, ...extra });
}

describe('glab adapter: offset walk under write traffic', () => {
  it('reads each row once when a newest-first list gains a row between pages', async () => {
    // Page 1 is [3,2]; a pipeline opens before page 2, which therefore starts at the old row 2 again.
    const port = adapter([okJson([pipeline(3), pipeline(2)]), okJson([pipeline(2), pipeline(1)]), okJson([])], { pageSize: 2 });
    expect((await port.listPipelines(1)).map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it('keeps tree entries that share a blob sha across paths', async () => {
    const e = (path: string) => ({ id: 'blobsha', name: path, type: 'blob', path, mode: '100644' });
    const port = adapter([okJson([e('a'), e('b')]), okJson([])], { pageSize: 2 });
    expect((await port.listTree(1)).map((t) => t.path)).toEqual(['a', 'b']);
  });
});

const fail = (status: number): ExecResult => ({ code: 1, stdout: '', stderr: `glab: ${status} (HTTP ${status})
` });

describe('glab adapter: transient 5xx on reads', () => {
  it('retries a 503 once and returns the second answer', async () => {
    const calls: string[][] = [];
    const port = adapter([fail(503), okJson({ id: 1, username: 'u' })], {}, calls);
    expect((await port.currentUser()).username).toBe('u');
    expect(calls).toHaveLength(2);
  });

  it('gives up with kind api after the retries, and does not retry a 500 or a 404', async () => {
    const calls: string[][] = [];
    const port = adapter([fail(502), fail(502), fail(502), fail(502)], {}, calls);
    await expect(port.currentUser()).rejects.toSatisfy((e) => isKind(e, 'api'));
    expect(calls).toHaveLength(4);
    for (const s of [500, 404]) {
      const c: string[][] = [];
      await expect(adapter([fail(s)], {}, c).currentUser()).rejects.toBeTruthy();
      expect(c).toHaveLength(1);
    }
  });
});
