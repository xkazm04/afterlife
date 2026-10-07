// One table of cases fed to both the gate (engine/decide/gate.ts) and the poller's class tier rows (derive/tiers.ts):
// a row never shows a tier the gate would not grant, and says why when the gate grants none.
import { describe, expect, it } from 'vitest';
import type { Tier, TierRecord, TierState } from '@/schemas/tier';
import type { ClassTierRow, MoveKind } from '@/server/index/repositories/fleet/classTier';
import { gate } from '../../../../engine/decide/gate';
import { NOW, policy } from '../../../../engine/__tests__/helpers';
import { deriveTiers } from '../derive/tiers';

const P = policy();
const rec = (tier: Tier, extra: Partial<TierRecord> = {}): TierRecord => ({ tier, since: '2026-10-09', by: 'test', ...extra });
const st = (agents: TierState['agents']): TierState => ({ version: 1, policy_sha: 'x', agents });

/** What a screen shows for a row: its tier, or 'blocked' when the gate grants no tier (no record, refused, human only). */
const shown = (r: ClassTierRow): string => (r.move?.kind === 'no_record' || r.move?.kind === 'refused' || r.tier === 'human_only' ? 'blocked' : (r.tier ?? 'unknown'));

/** The parity table: the gate's effective tier and the row's move for each case. */
const PARITY: ReadonlyArray<{ name: string; cls: string; state: TierState; tier: Tier | null; move: MoveKind | null }> = [
  { name: 'single holder', cls: 'dep-bump.patch', state: st({ 'ai-patcher-acme': { 'dep-bump.patch': rec('hands_off') } }), tier: 'hands_off', move: null },
  { name: 'single holder, over the ceiling', cls: 'code-fix.patch', state: st({ 'ai-patcher-acme': { 'code-fix.patch': rec('hands_off') } }), tier: 'supervised', move: null },
  {
    name: 'the holder named for the role among several', cls: 'dep-bump.patch',
    state: st({ 'ai-gardener-acme': { 'dep-bump.patch': rec('assisted') }, 'ai-patcher-acme': { 'dep-bump.patch': rec('hands_off') } }), tier: 'hands_off', move: null,
  },
  {
    name: 'several holders, none named for the role alone', cls: 'dep-bump.patch',
    state: st({ 'ai-patcher-a': { 'dep-bump.patch': rec('hands_off') }, 'ai-patcher-b': { 'dep-bump.patch': rec('supervised') } }), tier: null, move: 'refused',
  },
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
    const row = deriveTiers(P, state, 'p', NOW, new Map(), 7 * 86_400_000).rows.find((r) => r.classId === cls);
    expect(g.tier).toBe(tier);
    expect(row?.move?.kind ?? null).toBe(move);
    expect(row && shown(row)).toBe(g.tier ?? 'blocked');
    if (g.tier === null) expect(g.decision).toBe('block');
  });

  it('records the refusal with the holders, and the gate names them too', () => {
    const state = PARITY[3]!.state;
    const row = deriveTiers(P, state, 'p', NOW, new Map(), 7 * 86_400_000).rows.find((r) => r.classId === 'dep-bump.patch');
    expect(row).toMatchObject({ tier: 'quarantined', setBy: null, move: { kind: 'refused', note: 'ai-patcher-a, ai-patcher-b' } });
    expect(gate({ policy: P, state, classId: 'dep-bump.patch', now: NOW }).reasons[0]).toMatch(/several agents hold dep-bump.patch \(ai-patcher-a, ai-patcher-b\)/);
  });
});
