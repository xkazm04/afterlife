// A class whose record the poll counts as eligible gets one promotion ask in Needs you, counted on the badge, never
// duplicated by a second poll, and closed once its tier moves. Against the demo GitLab, with no mock between.
import { beforeEach, describe, expect, it } from 'vitest';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { closeProposal } from '@/server/index/repositories/work/proposal';
import { getNeedsYou } from '@/server/index/views';
import { NOW, rig, type Rig } from '../../__tests__/helpers';
import { DAY, mergeFive, setTier } from './fakeRecord';

const LATER = new Date(NOW.getTime() + 5 * 60_000);
const ID = 'promote:ledgerline:code-fix.patch';
let r: Rig;

const promotions = async (at: Date) => (await getNeedsYou(r.db, 'ledgerline', at)).filter((n) => n.kind === 'promote');

beforeEach(async () => {
  r = await rig();
  setTier(r.gl, 'assisted', new Date(NOW.getTime() - 10 * DAY));
  mergeFive(r.gl, NOW);
  const first = await r.poll();
  expect(first.projects.map((p) => p.error ?? null)).toEqual([null]);
}, 60_000);

describe('poll cycle: a promotion ask for an eligible class', () => {
  it('opens one, in the desk\'s form with each rule and its count, and the badge counts it', async () => {
    expect(await promotions(NOW)).toEqual([{
      id: ID, kind: 'promote', title: 'Promote T1 patcher · code-fix.patch', from: 'assisted', to: 'supervised',
      rules: [['accepted outputs', '5 / 5', true], ['reverts', '0', true], ['guardrail blocks', '0', true], ['counted over the last 5 outputs', 'last 5', true]],
      does: expect.stringContaining('policy MR'),
    }]);
    const all = await getNeedsYou(r.db, 'ledgerline', NOW);
    expect(all.map((n) => n.id).sort()).toEqual([ID, 'readmit:ledgerline:patch-bump']);
    expect((await getProjectRow(r.db, 'ledgerline'))?.needsYou).toBe(all.length);
  });

  it('a second poll does not duplicate it', async () => {
    await r.poll(LATER);
    expect((await promotions(LATER)).map((n) => n.id)).toEqual([ID]);
    expect((await getProjectRow(r.db, 'ledgerline'))?.needsYou).toBe(2);
  });

  it('closes it once the tier moves, and the badge drops it', async () => {
    setTier(r.gl, 'supervised', LATER);
    await r.poll(LATER);
    expect(await promotions(LATER)).toEqual([]);
    expect((await getProjectRow(r.db, 'ledgerline'))?.needsYou).toBe(1);
    const { rows } = await r.db.query<{ state: string }>('select state from proposal where id = $1', [ID]);
    expect(rows[0]?.state).toBe('expired');
  });

  it('is not opened again once a person acted on it, until the record moves', async () => {
    expect(await closeProposal(r.db, ID, 'acted', LATER, 'operator')).toBe(true);
    await r.poll(LATER);
    expect(await promotions(LATER)).toEqual([]);
  });

  it('a re-admit a person acted on is not opened again while the quarantine is the same one', async () => {
    expect(await closeProposal(r.db, 'readmit:ledgerline:patch-bump', 'acted', LATER, 'operator')).toBe(true);
    await r.poll(LATER);
    expect((await getNeedsYou(r.db, 'ledgerline', LATER)).map((n) => n.id)).toEqual([ID]);
  });
});

describe('poll cycle: a class in its cooldown', () => {
  it('opens no promotion ask while cooldown_until is ahead, and closes an open one', async () => {
    const since = new Date(NOW.getTime() - 10 * DAY);
    setTier(r.gl, 'assisted', since, 'code-fix.patch', { cooldown_until: new Date(LATER.getTime() + 2 * DAY).toISOString().slice(0, 10) });
    await r.poll(LATER);
    expect(await promotions(LATER)).toEqual([]);
    const after = new Date(LATER.getTime() + 3 * DAY);
    await r.poll(after);
    expect((await promotions(after)).map((n) => n.id)).toEqual([ID]);
  });
});
