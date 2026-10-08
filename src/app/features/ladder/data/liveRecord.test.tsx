// Live, Ladder's record columns show the record the poll counted and stored: the accepted count, and for no-edit, which
// no task row states for these merges (known from the ledger alone), a dash marked "not recorded" (never 0, never "No
// record yet"). Demo GitLab, no mock.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { setDataSource } from '@/server/data';
import { liveSource } from '@/server/data/live/liveSource';
import { buildSnapshot } from '@/server/data/live/snapshot';
import { rulesOf } from '@/server/data/policy';
import { NOW, rig } from '@/server/poller/__tests__/helpers';
import { DAY, mergeFive, setTier } from '@/server/poller/derive/__tests__/fakeRecord';
import { RecordCells } from '../components/table/RecordCells';
import type { ClassRow } from '../model/types';
import { loadLadderData } from './loadLadderData';

let cls: ClassRow;
beforeAll(async () => {
  const r = await rig();
  setTier(r.gl, 'assisted', new Date(NOW.getTime() - 10 * DAY));
  mergeFive(r.gl, NOW);
  const cycle = await r.poll();
  const snap = await buildSnapshot(r.db, NOW, 'ledgerline', DEMO, cycle.policy ? rulesOf(cycle.policy) : null);
  setDataSource(liveSource(() => snap));
  const c = loadLadderData().seed.classes.find((x) => x.id === 'code-fix.patch');
  if (!c) throw new Error('no code-fix.patch on the Ladder');
  cls = { ...c, pending: null };
}, 60_000);
afterAll(() => setDataSource(null));

describe('Ladder, live: the counted record', () => {
  it('reaches the row with each unknown counter null', () => {
    expect(cls.record).toEqual({ accepted: 5, needed: null, noEdit: null, cleanDays: 10, reverts: 0, guardrailBlocks: 0, window: 5 });
  });

  it('draws the live count, and a not-recorded dash for no-edit', () => {
    const cells = renderToStaticMarkup(<RecordCells cls={cls} />).split('role="gridcell"');
    expect(cells[2]).toContain('>5<'); // Acc
    expect(cells[3]).toContain('title="Not recorded · no task or ledger event states it"'); // No-edit
    expect(cells[3]).toContain('—');
    expect(cells.join('')).not.toContain('No record yet');
  });
});
