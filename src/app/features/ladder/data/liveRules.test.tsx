// Live, a guardrail verdict in an assisted class's last five outputs that no task row resolves leaves trust-policy.yml's
// guardrail_blocks rule "not recorded": the poll opens no promotion ask, and Ladder's greyed Promote names that rule.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { promotion, whyNot } from '@/lib/promotion';
import { setDataSource } from '@/server/data';
import { liveSource } from '@/server/data/live/liveSource';
import { buildSnapshot } from '@/server/data/live/snapshot';
import { rulesOf } from '@/server/data/policy';
import { NOW, rig } from '@/server/poller/__tests__/helpers';
import { DAY, appendEvents, mergeFive, setTier } from '@/server/poller/derive/__tests__/fakeRecord';
import { ActionCell } from '../components/table/ActionCell';
import { proofClassOf } from '../model/view/filters';
import { loadLadderData } from './loadLadderData';

/** Ladder's code-fix.patch after one poll of the demo GitLab: five merges since an assisted record, plus `extra`. */
async function ladderAfter(extra: (r: Awaited<ReturnType<typeof rig>>) => void) {
  const r = await rig();
  setTier(r.gl, 'assisted', new Date(NOW.getTime() - 10 * DAY));
  mergeFive(r.gl, NOW);
  extra(r);
  const cycle = await r.poll();
  const snap = await buildSnapshot(r.db, NOW, 'ledgerline', DEMO, cycle.policy ? rulesOf(cycle.policy) : null);
  setDataSource(liveSource(() => snap));
  const data = loadLadderData();
  const c = data.seed.classes.find((x) => x.id === 'code-fix.patch');
  if (!c) throw new Error('no code-fix.patch on the Ladder');
  const p = promotion(c, proofClassOf(Object.fromEntries(data.tracks.map((t) => [t.id, t])), c), data.policy);
  return { c: { ...c, pending: null }, p };
}
afterAll(() => setDataSource(null));

describe('Ladder, live: guardrail_blocks and window_last', () => {
  it('no guardrail verdict in the last five: the poll asks, and Promote is open with every rule met', async () => {
    const { c, p } = await ladderAfter(() => undefined);
    expect(c.ask?.id).toBe('promote:ledgerline:code-fix.patch');
    expect(p.kind === 'eligible' && p.rules.map((x) => [x.name, x.value])).toEqual([
      ['accepted outputs', '5 / 5'], ['reverts', '0'], ['guardrail blocks', '0'], ['counted over the last 5 outputs', 'last 5'],
    ]);
  }, 60_000);

  it('a verdict no task row resolves: no ask, and the greyed Promote names guardrail blocks as not recorded', async () => {
    const { c, p } = await ladderAfter((r) => appendEvents(r.gl, NOW, [{ iid: 105, daysAgo: 1, kind: 'guardrail_verdict' }]));
    expect(c.ask).toBeUndefined();
    expect([c.record?.accepted, c.record?.guardrailBlocks ?? null, c.record?.window]).toEqual([5, null, 5]);
    expect(whyNot(p)).toBe('guardrail blocks is not recorded: no task or ledger event states it');
    const out = renderToStaticMarkup(<ActionCell cls={c} promotion={p} onSelect={() => {}} onRevoke={() => {}} onTargets={() => {}} onPromote={() => {}} />);
    expect(out).toContain('title="Record does not qualify yet: guardrail blocks is not recorded: no task or ledger event states it"');
  }, 60_000);
});
