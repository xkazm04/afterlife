// A demotion committed to tier-state.yml reaches every screen on the next poll, with no mock between: the class tier
// row, Fleet's counts, the door's quarantine words and Ladder. And a class whose record leaves tier-state.yml reads
// "no record yet" on both screens, never as a quarantine.
import { parse } from 'yaml';
import { beforeEach, describe, expect, it } from 'vitest';
import { fleetTotals, MARK_TEST } from '@/app/features/door/model/words';
import { promotion } from '@/lib/promotion';
import { actsFrom, isQuarantine, shownName } from '@/app/features/ladder/model/rules/tiers';
import { tiersKnown } from '@/lib/tiers';
import { actionClass } from '@/server/data/live/narrow';
import { POLICY_GID } from '@/server/gitlab/fake/demo/ids';
import { listClassTiers } from '@/server/index/repositories/fleet/classTier';
import { getActionClasses, getFleet } from '@/server/index/views';
import { tripwire } from '../../../../engine/decide/tripwire';
import { parsePolicy } from '../../../../engine/policy/load';
import { NOW, rig, type Rig } from './helpers';

const LATER = new Date(NOW.getTime() + 5 * 60_000);
let r: Rig;

const policyFile = async (path: string): Promise<string> => (await r.gl.port.getFile(POLICY_GID, path, 'main'))?.content ?? '';
const commit = async (content: string, message: string): Promise<void> => {
  await r.gl.port.execute(r.gl.port.plan.commitFile({ project: POLICY_GID, path: 'tier-state.yml', branch: 'main', content, message, action: 'update' }));
};
const ledgerline = async (at: Date) => (await getFleet(r.db, at)).projects.find((p) => p.id === 'ledgerline')!;

beforeEach(async () => {
  r = await rig();
  await r.poll();
}, 60_000);

describe('a tripwire demotion reaches Fleet, the door and Ladder on the next poll', () => {
  it('moves the row, the counts and the quarantine words', async () => {
    const before = await ledgerline(NOW);
    expect(before.tiers).toEqual({ hands_off: 5, supervised: 3, assisted: 1, quarantined: 1, human_only: 2 });
    expect(fleetTotals([before]).quar).toBe(1);

    const policy = parsePolicy(parse(await policyFile('trust-policy.yml')));
    const t = tripwire(policy, await policyFile('tier-state.yml'), 'tier-state.yml',
      { trigger: 'guardrail_high', agent: 'ai-patcher-acme-lab', class: 'dep-bump.patch', evidence: '!41' }, LATER);
    expect(t.commit?.message).toMatch(/^tripwire: dep-bump.patch hands_off -> quarantined/);
    await commit(t.commit!.content, t.commit!.message);
    expect((await r.poll(LATER)).projects[0]).toMatchObject({ ok: true });

    const row = (await listClassTiers(r.db, 'ledgerline')).find((x) => x.classId === 'dep-bump.patch');
    expect(row).toMatchObject({ tier: 'quarantined', setBy: 'tripwire', move: { kind: 'tripwire', note: 'guardrail_high' } });
    expect(row?.move?.at?.toISOString().slice(0, 10)).toBe(LATER.toISOString().slice(0, 10));

    const after = await ledgerline(LATER);
    expect(after.classTiers['dep-bump.patch']).toBe('quarantined');
    expect(tiersKnown(after)).toBe(true); // armed is 0 on a live project; the tiers are known from the rows
    expect(after.tiers).toEqual({ hands_off: 4, supervised: 3, assisted: 1, quarantined: 2, human_only: 2 });
    expect(fleetTotals([after]).quar).toBe(2);
    expect(MARK_TEST.quar(after)).toBe(true);
    const ladder = await getActionClasses(r.db, 'ledgerline', LATER);
    expect(ladder.find((c) => c.id === 'dep-bump.patch')).toMatchObject({ tier: 'quarantined', lastMove: expect.stringContaining('tripwire') });
    const real = actionClass(ladder.find((c) => c.id === 'dep-bump.patch')!); // a real quarantine keeps its Re-admit
    expect([shownName(real), isQuarantine(real), promotion(real, 'exploit-test', null).kind]).toEqual(['Quarantined', true, 'readmit']);
  }, 60_000);
});

describe('a class with no record reads "no record yet", never quarantined', () => {
  it('drops out of every count and lights its own mark on the door', async () => {
    const text = await policyFile('tier-state.yml');
    const without = text.split('\n').filter((l) => !/^\s+code-fix\.patch:/.test(l)).join('\n');
    expect(without).not.toBe(text);
    await commit(without, 'drop code-fix.patch');
    await r.poll(LATER);

    expect((await listClassTiers(r.db, 'ledgerline')).find((x) => x.classId === 'code-fix.patch')).toMatchObject({ tier: 'quarantined', move: { kind: 'no_record' } });
    const after = await ledgerline(LATER);
    expect(after.classTiers['code-fix.patch']).toBe('no_record');
    expect(after.tiers).toEqual({ hands_off: 5, supervised: 2, assisted: 1, quarantined: 1, human_only: 2 });
    expect(fleetTotals([after])).toMatchObject({ quar: 1, norec: 1 });
    expect(MARK_TEST.norec(after)).toBe(true);
    const ladder = await getActionClasses(r.db, 'ledgerline', LATER);
    expect(ladder.find((c) => c.id === 'code-fix.patch')?.lastMove).toBe('no tier record: not trusted');
    // Ladder's tier cell, as the screen takes the class (narrow): No record yet, no rung, no Re-admit, nothing to revoke
    const shown = actionClass(ladder.find((c) => c.id === 'code-fix.patch')!);
    expect(shown.cell).toBe('no_record');
    expect(shownName(shown)).toBe('No record yet');
    expect([isQuarantine(shown), actsFrom(shown), promotion(shown, 'exploit-test', null).kind]).toEqual([false, null, 'norecord']);
  }, 60_000);
});
