// What moved on each project since the last look: a digest of the fields an operator acts on, and the typed changes
// between two digests. Unknown is never a zero: tiers that were unknown and are now read are a first read, not a tier
// change, and proofs or demotions unknown on either side say nothing.
import { STATE_LABEL } from '@/lib/demo/labels';
import type { FleetProject, ProjectState, TierCounts, TierKey } from '@/lib/demo/types';
import { TIER_META, tiersKnown } from '@/lib/tiers';

/** The part of a project the change marks compare. Everything else (feed age, stages) moves on its own. */
export interface Digest {
  /** null: unknown. */
  tiers: TierCounts | null;
  needsYou: number;
  /** Failing proofs of the last 7 days; null: unknown. */
  fail: number | null;
  demotions: number | null;
  state: ProjectState;
}

export type Change =
  | { kind: 'new' }
  | { kind: 'first-read' }
  | { kind: 'stale' }
  | { kind: 'recovered' }
  | { kind: 'state'; from: ProjectState; to: ProjectState }
  | { kind: 'quarantined'; by: number }
  | { kind: 'tier-down'; from: TierKey; by: number }
  | { kind: 'tier-up'; to: TierKey; by: number }
  | { kind: 'needs'; by: number }
  | { kind: 'fail'; by: number }
  | { kind: 'demoted'; by: number };

export type FleetChanges = Readonly<Record<string, readonly Change[]>>;

/** The tiers a class climbs, most autonomy first; a quarantine is its own change. */
const LADDER: readonly TierKey[] = ['hands_off', 'supervised', 'assisted'];

export const digestOf = (p: FleetProject): Digest => ({
  tiers: tiersKnown(p) ? { ...p.tiers } : null,
  needsYou: p.needsYou,
  fail: p.proofs7d ? p.proofs7d.fail : null,
  demotions: p.demotions7d,
  state: p.state,
});

export const digestFleet = (projects: readonly FleetProject[]): Record<string, Digest> => Object.fromEntries(projects.map((p) => [p.id, digestOf(p)]));

/** Classes at this tier or above. */
const atOrAbove = (t: TierCounts, tier: TierKey): number => LADDER.slice(0, LADDER.indexOf(tier) + 1).reduce((n, k) => n + t[k], 0);

/** The highest rung classes left (tier-down) and the highest they reached (tier-up), each once. */
function tierChanges(a: TierCounts, b: TierCounts): Change[] {
  const out: Change[] = [];
  if (b.quarantined > a.quarantined) out.push({ kind: 'quarantined', by: b.quarantined - a.quarantined });
  const deltas = LADDER.map((t) => [t, atOrAbove(b, t) - atOrAbove(a, t)] as const);
  const down = deltas.find(([, d]) => d < 0);
  const up = deltas.find(([, d]) => d > 0);
  if (down) out.push({ kind: 'tier-down', from: down[0], by: -down[1] });
  if (up) out.push({ kind: 'tier-up', to: up[0], by: up[1] });
  return out;
}

/** A count that rose; unknown on either side is no change. */
const rose = (a: number | null, b: number | null): number => (a !== null && b !== null && b > a ? b - a : 0);

export function diffProject(before: Digest | undefined, p: FleetProject): Change[] {
  if (!before) return [{ kind: 'new' }];
  const after = digestOf(p);
  const out: Change[] = [];
  if (before.state !== after.state) {
    if (after.state === 'stale') out.push({ kind: 'stale' });
    else if (before.state === 'stale') out.push({ kind: 'recovered' });
    else out.push({ kind: 'state', from: before.state, to: after.state });
  }
  if (!before.tiers && after.tiers) out.push({ kind: 'first-read' });
  else if (before.tiers && after.tiers) out.push(...tierChanges(before.tiers, after.tiers));
  const counts = [['needs', rose(before.needsYou, after.needsYou)], ['fail', rose(before.fail, after.fail)], ['demoted', rose(before.demotions, after.demotions)]] as const;
  for (const [kind, by] of counts) if (by) out.push({ kind, by });
  return out;
}

/** Each project that moved, by id; a project with no change has no entry. Projects gone since the baseline are not listed. */
export function diffFleet(before: Readonly<Record<string, Digest>>, after: readonly FleetProject[]): FleetChanges {
  const out: Record<string, Change[]> = {};
  for (const p of after) {
    const c = diffProject(before[p.id], p);
    if (c.length) out[p.id] = c;
  }
  return out;
}

export function changeText(c: Change): string {
  switch (c.kind) {
    case 'new': return 'new on the fleet';
    case 'first-read': return 'tiers read for the first time';
    case 'stale': return 'went stale';
    case 'recovered': return 'no longer stale';
    case 'state': return `${STATE_LABEL[c.from]} → ${STATE_LABEL[c.to]}`;
    case 'quarantined': return `quarantined +${c.by}`;
    case 'tier-down': return `${c.by} down from ${TIER_META[c.from].name}`;
    case 'tier-up': return `${c.by} up to ${TIER_META[c.to].name}`;
    case 'needs': return `needs you +${c.by}`;
    case 'fail': return `failing proofs +${c.by}`;
    case 'demoted': return `demotions +${c.by}`;
  }
}

const SINCE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** The time of the last look, in the viewer's zone: "16 Oct, 09:30". */
export const sinceLabel = (at: number): string => SINCE.format(at);

/** A change mark's title: "needs you +2, 1 down from Hands-off since 16 Oct, 09:30". */
export const changeTitle = (changes: readonly Change[], at: number): string => `${changes.map(changeText).join(', ')} since ${sinceLabel(at)}`;

/** What the screen draws from a baseline: no baseline (none stored, unreadable, before mount) is no change at all. */
export function changesFrom(base: { at: number; digests: Readonly<Record<string, Digest>> } | null, projects: readonly FleetProject[]) {
  const changes = base ? diffFleet(base.digests, projects) : {};
  const ids: ReadonlySet<string> = new Set(Object.keys(changes));
  const marks: Readonly<Record<string, string>> = base ? Object.fromEntries(Object.entries(changes).map(([id, c]) => [id, changeTitle(c, base.at)])) : {};
  return { changes, ids, marks, count: ids.size, since: base?.at ?? null };
}
