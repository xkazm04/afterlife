// With the guardrail armed the gate writes a guardrail_verdict beside every decision, and the event states pass or block.
// An assisted class whose last window_last merged outputs each passed reads 0 guardrail blocks, is eligible for Supervised,
// and gets a promotion ask; a block in the window keeps the rule unmet; an event that states no verdict reads not recorded.
// Against the demo GitLab, with no mock between.
import { describe, expect, it } from 'vitest';
import { getNeedsYou } from '@/server/index/views';
import { listClassTiers } from '@/server/index/repositories/fleet/classTier';
import { NOW, rig } from '../../__tests__/helpers';
import { appendEvents, DAY, setTier } from './fakeRecord';

const MRS = [101, 102, 103, 104, 105];

/** Five merges of code-fix.patch, each with the gate's guardrail_verdict before it; `verdictOf` says what each states. */
async function armed(verdictOf: (iid: number) => 'pass' | 'block' | undefined) {
  const r = await rig();
  setTier(r.gl, 'assisted', new Date(NOW.getTime() - 10 * DAY));
  appendEvents(r.gl, NOW, MRS.flatMap((iid, i) => [
    { iid, daysAgo: 5 - i + 0.1, kind: 'guardrail_verdict' as const, verdict: verdictOf(iid) },
    { iid, daysAgo: 5 - i },
  ]));
  const cycle = await r.poll();
  expect(cycle.projects.map((p) => p.error ?? null)).toEqual([null]);
  const row = (await listClassTiers(r.db, 'ledgerline')).find((c) => c.classId === 'code-fix.patch');
  const asks = (await getNeedsYou(r.db, 'ledgerline', NOW)).filter((n) => n.kind === 'promote');
  return { record: row?.record ?? null, asks };
}

describe('guardrail armed: the ledger states each verdict', () => {
  it('every merged output passed: 0 blocks, eligible for Supervised, and a promotion ask opens', async () => {
    const { record, asks } = await armed(() => 'pass');
    expect(record).toMatchObject({ accepted: 5, guardrailBlocks: 0, window: 5, reverts: 0 });
    expect(asks).toEqual([expect.objectContaining({
      id: 'promote:ledgerline:code-fix.patch', from: 'assisted', to: 'supervised',
      rules: expect.arrayContaining([['guardrail blocks', '0', true]]),
    })]);
  });

  it('a block in the window keeps the rule unmet: no ask', async () => {
    const { record, asks } = await armed((iid) => (iid === 103 ? 'block' : 'pass'));
    expect(record).toMatchObject({ accepted: 5, guardrailBlocks: 1 });
    expect(asks).toEqual([]);
  });

  it('an event written before the ledger stated the verdict still reads not recorded: no ask', async () => {
    const { record, asks } = await armed((iid) => (iid === 103 ? undefined : 'pass'));
    expect(record).toMatchObject({ accepted: 5 });
    expect(record?.guardrailBlocks ?? null).toBeNull(); // a null counter is stored as none
    expect(asks).toEqual([]);
  });
});
