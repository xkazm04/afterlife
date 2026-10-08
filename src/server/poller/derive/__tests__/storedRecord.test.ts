// The poll stores the record it counted on the class's class_tier row, each counter on its own: accepted is counted from
// the ledger, and no-edit, which no task row states for merges known from the ledger alone, is stored null (never 0). Against the demo GitLab, with no mock between.
import { beforeEach, describe, expect, it } from 'vitest';
import { listClassTiers } from '@/server/index/repositories/fleet/classTier';
import { NOW, rig, type Rig } from '../../__tests__/helpers';
import { DAY, appendEvents, mergeFive, setTier } from './fakeRecord';

let r: Rig;
const row = async (cls: string) => (await listClassTiers(r.db, 'ledgerline')).find((t) => t.classId === cls);

beforeEach(async () => {
  r = await rig();
  setTier(r.gl, 'assisted', new Date(NOW.getTime() - 10 * DAY));
  mergeFive(r.gl, NOW);
  expect((await r.poll()).projects.map((p) => p.error ?? null)).toEqual([null]);
}, 60_000);

describe('poll cycle: the counted record is stored', () => {
  it('a class one agent holds reads back with accepted counted and no-edit null', async () => {
    const t = await row('code-fix.patch');
    expect(t?.record).toMatchObject({ accepted: 5, needed: null, noEdit: null, cleanDays: 10, reverts: 0 });
    const { rows } = await r.db.query<{ accepted: number | null; no_edit: number | null }>(
      "select accepted, no_edit from class_tier where project_id = 'ledgerline' and class_id = 'code-fix.patch'",
    );
    expect(rows).toEqual([{ accepted: 5, no_edit: null }]);
  });

  it('a later poll stores the new count', async () => {
    setTier(r.gl, 'supervised', new Date(NOW.getTime() - 10 * DAY)); // counted since since, not over the last 5
    appendEvents(r.gl, NOW, [{ iid: 106, daysAgo: 0.5 }]);
    await r.poll(new Date(NOW.getTime() + 60_000));
    expect((await row('code-fix.patch'))?.record?.accepted).toBe(6);
  });
});
