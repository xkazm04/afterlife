import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearJobs, jobOf, startCollect } from './jobs';

afterEach(clearJobs);

const result = { slug: 's', ci: { added: 4, total: 10 }, probes: [] };

describe('collect jobs', () => {
  it('starts in the background and returns at once; the job then records what it added', async () => {
    let finish: () => void = () => undefined;
    const collect = vi.fn(() => new Promise<typeof result>((r) => (finish = () => r(result))));
    const job = startCollect('s', collect);
    expect(job).toEqual({ startedAt: expect.any(String) });
    await vi.waitFor(() => expect(collect).toHaveBeenCalledTimes(1));
    expect(jobOf('s')).not.toHaveProperty('done');
    finish();
    await vi.waitFor(() => expect(jobOf('s')?.done).toBeDefined());
    expect(jobOf('s')).toMatchObject({ added: 4, total: 10, probes: [] });
    expect(jobOf('s')).not.toHaveProperty('prodAdded');
  });
  it('a second start while one runs returns the running job and collects nothing more', async () => {
    const collect = vi.fn(() => new Promise<typeof result>(() => undefined));
    const a = startCollect('s', collect);
    const b = startCollect('s', collect);
    expect(b.startedAt).toBe(a.startedAt);
    await vi.waitFor(() => expect(collect).toHaveBeenCalledTimes(1));
  });
  it('a failing collect records its reason and never throws; the next start runs again', async () => {
    startCollect('s', async () => { throw new Error('az: login expired, run az login'); });
    await vi.waitFor(() => expect(jobOf('s')?.error).toBe('az: login expired, run az login'));
    const collect = vi.fn(async () => result);
    startCollect('s', collect);
    await vi.waitFor(() => expect(jobOf('s')?.added).toBe(4));
  });
  it('jobOf is a copy, and unknown for a slug never collected', () => {
    expect(jobOf('none')).toBeUndefined();
    startCollect('s', () => new Promise(() => undefined));
    const j = jobOf('s')!;
    j.done = 'x';
    expect(jobOf('s')).not.toHaveProperty('done');
  });
});
