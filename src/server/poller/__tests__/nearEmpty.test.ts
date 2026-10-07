// M1 day one: tier-state.yml holds almost nothing. Fleet, the door and Ladder read the same polled index and must name
// the same standing for every class: a held tier, No record yet (never Quarantined, never Re-admit), or a class several
// agents hold, split, with each holder at the tier the gate grants a merge request that holder authored.
import { beforeAll, describe, expect, it } from 'vitest';
import { fleetTotals, MARK_TEST } from '@/app/features/door/model/words';
import { cellOf, holdersOf, isQuarantine, shownName } from '@/app/features/ladder/model/rules/tiers';
import type { FleetProject } from '@/lib/demo/types';
import { cellLetter, cellName } from '@/lib/tiers';
import { POLICY_GID } from '@/server/gitlab/fake/demo/ids';
import { getActionClasses, getFleet } from '@/server/index/views';
import { actionClass } from '@/server/data/live/narrow';
import type { ActionClass } from '@/lib/demo/types';
import { parse } from 'yaml';
import { gate } from '../../../../engine/decide/gate';
import { parsePolicy } from '../../../../engine/policy/load';
import type { TierState } from '@/schemas/tier';
import { NOW, rig, type Rig } from './helpers';

const LATER = new Date(NOW.getTime() + 5 * 60_000);
const NEAR_EMPTY = [
  'version: 1', 'policy_sha: a1b2c3', 'agents:',
  '  ai-patcher-acme-lab:',
  '    dep-bump.patch: { tier: assisted, since: "2026-10-06T14:22:00.000Z", by: "start tier + record" }',
  '  ai-qa-acme-lab:',
  '    qa.file-bug: { tier: assisted, since: "2026-10-06T14:22:00.000Z", by: "start tier + record" }',
  '  ai-qa-second:',
  '    qa.file-bug: { tier: hands_off, since: "2026-10-06T14:22:00.000Z", by: "start tier + record" }',
  '',
].join('\n');

let r: Rig;
let fleet: FleetProject;
let ladder: ActionClass[];
let classes: string[];

beforeAll(async () => {
  r = await rig();
  await r.poll();
  await r.gl.port.execute(r.gl.port.plan.commitFile({ project: POLICY_GID, path: 'tier-state.yml', branch: 'main', content: NEAR_EMPTY, message: 'day one', action: 'update' }));
  await r.poll(LATER);
  const f = await getFleet(r.db, LATER);
  fleet = f.projects.find((p) => p.id === 'ledgerline')!;
  classes = f.classes;
  ladder = (await getActionClasses(r.db, 'ledgerline', LATER)).map(actionClass);
}, 60_000);

describe('a near-empty tier-state.yml reads the same on Fleet, the door and Ladder', () => {
  it('names the same standing for every class on all three', () => {
    for (const id of classes) {
      const lc = ladder.find((c) => c.id === id)!;
      const fleetName = cellName(fleet.classTiers[id], fleet.holders?.[id]);
      expect([id, cellOf(lc)]).toEqual([id, fleet.classTiers[id]]); // Ladder's cell is Fleet's and the door's
      expect([id, shownName(lc)]).toEqual([id, fleetName]);
      expect(cellLetter(cellOf(lc), holdersOf(lc))).toBe(cellLetter(fleet.classTiers[id], fleet.holders?.[id])); // the door's letter
    }
  });

  it('shows no class as Quarantined and offers no Re-admit: no record yet is not a quarantine', () => {
    expect(Object.values(fleet.classTiers)).not.toContain('quarantined');
    expect(ladder.filter(isQuarantine)).toEqual([]);
    expect(ladder.filter((c) => shownName(c) === 'No record yet').length).toBeGreaterThan(5);
    expect(fleetTotals([fleet])).toMatchObject({ quar: 0, split: 1 });
    expect(fleetTotals([fleet]).norec).toBe(Object.values(fleet.classTiers).filter((c) => c === 'no_record').length);
    expect([MARK_TEST.quar(fleet), MARK_TEST.norec(fleet), MARK_TEST.split(fleet)]).toEqual([false, true, true]);
  });

  it('reads the class two agents hold as split, each holder at the tier the gate grants its own merge requests', async () => {
    expect(fleet.classTiers['qa.file-bug']).toBe('refused');
    const policy = parsePolicy(parse((await r.gl.port.getFile(POLICY_GID, 'trust-policy.yml', 'main'))?.content ?? ''));
    const state = parse(NEAR_EMPTY) as TierState;
    const holders = fleet.holders?.['qa.file-bug'] ?? [];
    expect(holders.map((h) => h.agent).sort()).toEqual(['ai-qa-acme-lab', 'ai-qa-second']);
    for (const h of holders) expect(h.tier).toBe(gate({ policy, state, classId: 'qa.file-bug', agent: h.agent, now: LATER }).tier);
    expect(shownName(ladder.find((c) => c.id === 'qa.file-bug')!)).toBe(cellName('refused', holders));
    expect(shownName(ladder.find((c) => c.id === 'qa.file-bug')!)).not.toMatch(/block|refuse/i);
  });
});
