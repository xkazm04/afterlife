// "Merged without edits": before the MR merged, no commit reached it from anyone but the agent that opened it. The poll
// reads it from the notes it already reads (GitLab's "added N commits" system note, authored by the pusher). A supervised
// class with 15 merged outputs, none edited, is eligible for Hands-off; one person's push makes it 14/15; a merge the poll
// knows only from the ledger leaves it not recorded. qa.file-bug's proof class is set to exploit-test (the demo's 'repro'
// is an engine stub, never mechanical: no Hands-off ask on it). Against the demo GitLab, with no mock between.
import { describe, expect, it } from 'vitest';
import { listClassTiers } from '@/server/index/repositories/fleet/classTier';
import { getNeedsYou } from '@/server/index/views';
import { NOW, rig } from '../../__tests__/helpers';
import { appendEvents, DAY, mergedMrs, setProof, setTier } from './fakeRecord';

const QA = 'ai-qa-acme-lab';
const CLS = 'qa.file-bug';
const IIDS = Array.from({ length: 15 }, (_, i) => 201 + i);

/** qa.file-bug supervised for 20 days (clean days met, reverts 0), with 15 merges; `pushesOf` says who pushed to each. */
async function polled(pushesOf: (iid: number) => string[], more?: (r: Awaited<ReturnType<typeof rig>>) => void, proof = 'exploit-test') {
  const r = await rig();
  setProof(r.gl, CLS, proof);
  setTier(r.gl, 'supervised', new Date(NOW.getTime() - 20 * DAY), CLS);
  mergedMrs(r.gl, NOW, QA, CLS, IIDS.map((iid) => ({ iid, pushes: pushesOf(iid) })));
  more?.(r);
  const cycle = await r.poll();
  expect(cycle.projects.map((p) => p.error ?? null)).toEqual([null]);
  const row = (await listClassTiers(r.db, 'ledgerline')).find((c) => c.classId === CLS);
  const asks = (await getNeedsYou(r.db, 'ledgerline', NOW)).filter((n) => n.kind === 'promote');
  return { record: row?.record ?? null, asks };
}

describe('no-edit, counted from the merge requests\' push notes', () => {
  it('15 merged outputs, none edited (the agent pushed twice to each, itself): 1, eligible for Hands-off, and an ask opens', async () => {
    const { record, asks } = await polled(() => [QA, QA]);
    expect(record).toMatchObject({ accepted: 15, noEdit: 1, reverts: 0, cleanDays: 20 });
    expect(asks).toEqual([expect.objectContaining({
      id: `promote:ledgerline:${CLS}`, from: 'supervised', to: 'hands_off',
      rules: expect.arrayContaining([['merged without edits ≥ 90 %', '100 %', true]]),
    })]);
  });

  it("on the demo's own proof class, repro (an engine stub that never passes), the same record opens no Hands-off ask", async () => {
    const { record, asks } = await polled(() => [QA, QA], undefined, 'repro');
    expect(record).toMatchObject({ accepted: 15, noEdit: 1 });
    expect(asks).toEqual([]);
  });

  it('one person\'s commit on one of them: 14/15', async () => {
    const { record } = await polled((iid) => (iid === 207 ? [QA, 'mariam'] : [QA]));
    expect(record?.accepted).toBe(15);
    expect(record?.noEdit).toBe(14 / 15);
  });

  it('a merge known only from a ledger merged event (its notes not read) leaves it not recorded: no ask', async () => {
    // !199 merged 3 days ago: outside the poll's task window, so no task row and no notes read for it
    const { record, asks } = await polled(() => [QA], (r) => appendEvents(r.gl, NOW, [{ iid: 199, daysAgo: 3, agent: QA, cls: CLS }]));
    expect(record?.accepted).toBe(16);
    expect(record?.noEdit ?? null).toBeNull();
    expect(asks).toEqual([]);
  });
});
