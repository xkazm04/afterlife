import { describe, expect, it } from 'vitest';
import { createFakeGitLab } from '../../fake/fakeGitLab';

const LEDGERLINE = 90010001;

// GitLab's updated_after is "updated on or after" (docs.gitlab.com/api/merge_requests): the fake answers the same.
describe('fake GitLab: MR updated_after, as GitLab reads it', () => {
  const { port } = createFakeGitLab();
  const iids = async (updatedAfter: string) => (await port.listMergeRequests(LEDGERLINE, { updatedAfter })).map((m) => m.iid).sort();

  it('keeps an MR updated exactly at the bound', async () => {
    expect(await iids('2026-10-08T10:07:00.000Z')).toHaveLength(1);
  });

  it('reads the bound as a time, not as text: an offset or a second-precision stamp is the same instant', async () => {
    expect(await iids('2026-10-08T12:07:00+02:00')).toEqual(await iids('2026-10-08T10:07:00.000Z'));
    expect(await iids('2026-10-08T09:21:03Z')).toHaveLength(2);
    expect(await iids('2026-10-08T10:07:01Z')).toEqual([]);
  });
});
