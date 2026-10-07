import { describe, expect, it, vi } from 'vitest';
import { copyText } from './copy';

describe('Copy', () => {
  it('says Copied when the clipboard took the text', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    expect(await copyText('glab api ...', { writeText })).toEqual({ ok: true, text: 'Copied · nothing sent' });
    expect(writeText).toHaveBeenCalledWith('glab api ...');
  });
  it('reports a failed clipboard write as a failure, never as Copied', async () => {
    const r = await copyText('x', { writeText: () => Promise.reject(new DOMException('Document is not focused.', 'NotAllowedError')) });
    expect(r).toEqual({ ok: false, text: 'Copy failed · Document is not focused. · nothing sent' });
    expect(r.text).not.toMatch(/Copied/);
  });
  it('reports a clipboard that throws, or none at all', async () => {
    expect((await copyText('x', { writeText: () => { throw new Error('boom'); } })).ok).toBe(false);
    expect(await copyText('x', undefined)).toMatchObject({ ok: false, text: expect.stringMatching(/^Copy failed/) });
  });
});
