// One table of cases fed to both the gate (engine/decide/gate.ts) and the poller's class tier rows (derive/tiers.ts), read
// back the way every screen reads them (views/standing.ts): a row never shows a tier the gate would not grant, and says
// why when the gate grants none. A class several agents hold is checked with the input CI sends: --agent, the MR author.
import { describe, expect, it } from 'vitest';
import type { Tier, TierRecord, TierState } from '@/schemas/tier';
import type { ClassTierRow, MoveKind } from '@/server/index/repositories/fleet/classTier';
import { gate } from '../../../../engine/decide/gate';
import { NOW, policy } from '../../../../engine/__tests__/helpers';
import { shownOf } from '@/server/index/views/standing';
import { deriveTiers } from '../derive/tiers';

const P = policy();
const rec = (tier: Tier, extra: Partial<TierRecord> = {}): TierRecord => ({ tier, since: '2026-10-09', by: 'test', ...extra });
const st = (agents: TierState['agents']): TierState => ({ version: 1, policy_sha: 'x', agents });

/** What a screen shows for a one-holder row: its tier, or 'blocked' when the gate grants no tier (no record, human only). */
const shown = (r: ClassTierRow): string => {
  const { cell } = shownOf(r);
  return cell === 'no_record' || cell === 'human_only' ? 'blocked' : (cell ?? 'unknown');
};
const rowOf = (state: TierState, cls: string): ClassTierRow | undefined =>
  deriveTiers(P, state, 'p', NOW, new Map(), 7 * 86_400_000).rows.find((r) => r.classId === cls);

/** The parity table: the gate's effective tier and the row's move for each case. */
const PARITY: ReadonlyArray<{ name: string; cls: string; state: TierState; tier: Tier | null; move: MoveKind | null }> = [
  { name: 'single holder', cls: 'dep-bump.patch', state: st({ 'ai-patcher-acme': { 'dep-bump.patch': rec('hands_off') } }), tier: 'hands_off', move: null },
  { name: 'single holder, over the ceiling', cls: 'code-fix.patch', state: st({ 'ai-patcher-acme': { 'code-fix.patch': rec('hands_off') } }), tier: 'supervised', move: null },
  {
    name: 'a lapsed hands-off lease', cls: 'dep-bump.patch',
    state: st({ 'ai-patcher-acme': { 'dep-bump.patch': rec('hands_off', { lease_expires: '2026-10-20T00:00:00Z' }) } }), tier: 'supervised', move: 'note',
  },
  {
    name: 'a tripwire record', cls: 'patch-bump',
    state: st({ 'ai-gardener-acme': { 'patch-bump': rec('quarantined', { by: 'tripwire', reason: 'guardrail_high', evidence: '!44' }) } }), tier: 'quarantined', move: 'tripwire',
  },
  { name: 'no record', cls: 'code-fix.patch', state: st({ 'ai-patcher-acme': { 'dep-bump.patch': rec('hands_off') } }), tier: null, move: 'no_record' },
  { name: 'human_only', cls: 'report.submit', state: st({ 'ai-cra-acme': { 'report.submit': rec('hands_off') } }), tier: null, move: null },
];

describe('the gate and the class tier rows read one rule', () => {
  it.each(PARITY)('$name', ({ cls, state, tier, move }) => {
    const g = gate({ policy: P, state, classId: cls, now: NOW });
    const row = rowOf(state, cls);
    expect(g.tier).toBe(tier);
    expect(row?.move?.kind ?? null).toBe(move);
    expect(row && shown(row)).toBe(g.tier ?? 'blocked');
    if (g.tier === null) expect(g.decision).toBe('block');
  });
});

/** Several holders: one named for the role (patcher) among them, or none. Each holder's record differs, one over the ceiling. */
const SEVERAL: ReadonlyArray<{ name: string; cls: string; state: TierState }> = [
  {
    name: 'the holder named for the role among several', cls: 'dep-bump.patch',
    state: st({ 'ai-gardener-acme': { 'dep-bump.patch': rec('assisted') }, 'ai-patcher-acme': { 'dep-bump.patch': rec('hands_off') } }),
  },
  {
    name: 'several holders, none named for the role alone', cls: 'dep-bump.patch',
    state: st({ 'ai-patcher-a': { 'dep-bump.patch': rec('hands_off') }, 'ai-patcher-b': { 'dep-bump.patch': rec('supervised') } }),
  },
  {
    name: 'three holders, one over the ceiling, one with a lapsed lease', cls: 'code-fix.patch',
    state: st({
      'ai-patcher-a': { 'code-fix.patch': rec('hands_off') },
      'ai-patcher-b': { 'code-fix.patch': rec('assisted') },
      'ai-medic-acme': { 'code-fix.patch': rec('quarantined', { by: 'tripwire', reason: 'revert' }) },
    }),
  },
];

describe('a class several agents hold: each holder as CI gates its MRs (--agent, the author)', () => {
  it.each(SEVERAL)('$name: every holder is listed at the tier gate({..., agent}) grants it', ({ cls, state }) => {
    const row = rowOf(state, cls)!;
    const { cell, holders } = shownOf(row);
    expect(cell).toBe('refused');
    expect(holders?.map((h) => h.agent).sort()).toEqual(Object.keys(state.agents).sort()); // every holder, the named one too
    for (const h of holders ?? []) {
      const g = gate({ policy: P, state, classId: cls, agent: h.agent, now: NOW });
      expect(g.agent).toBe(h.agent);
      expect(h.tier).toBe(g.tier);
    }
  });

  it('stores the most restrictive holder as the row tier, and no single record', () => {
    const row = rowOf(SEVERAL[2]!.state, 'code-fix.patch');
    expect(row).toMatchObject({
      tier: 'quarantined', setBy: null, since: null,
      move: { kind: 'refused', note: 'ai-patcher-a=supervised, ai-patcher-b=assisted, ai-medic-acme=quarantined' },
    });
  });

  it('the role-named holder is listed at its own tier, as the gate gives it without --agent too', () => {
    const { state } = SEVERAL[0]!;
    const named = shownOf(rowOf(state, 'dep-bump.patch')!).holders?.find((h) => h.agent === 'ai-patcher-acme');
    expect(named?.tier).toBe(gate({ policy: P, state, classId: 'dep-bump.patch', now: NOW }).tier);
  });
});
