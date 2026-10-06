// The words of the inspector: class records, decision meta lines, the feed rows. Pure; the sections only draw them.
import { formatAge } from '@/lib/format/time';
import type { ActionClass, FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { TIER_META } from '@/lib/tiers';
import type { DeepProject } from './types';

/** "16/15 · 9 d": accepted outputs / needed, and the days left on the lease. Empty when the demo has no record. */
export function recordLabel(c: ActionClass | undefined): string {
  if (!c?.record) return '';
  const needed = c.record.needed ? `/${c.record.needed}` : '';
  const lease = c.lease_days ? ` · ${c.lease_days} d` : '';
  return `${c.record.accepted}${needed}${lease}`;
}

/** "16/15 accepted" for the tier popover. */
export function acceptedLabel(c: ActionClass | undefined): string {
  if (!c?.record) return '';
  return `${c.record.accepted}${c.record.needed ? `/${c.record.needed}` : ''} accepted`;
}

/** The tooltip of a class row: its last move, and the ceiling when it is below it. */
export function classTip(c: ActionClass | undefined): string {
  if (!c) return '';
  return `${c.lastMove}${c.ceiling !== c.tier ? ` · ceiling ${TIER_META[c.ceiling].name}` : ''}`;
}

/** The dim line under a decision: due time, the tier move (S → H), the reason, the number of gaps. */
export function needsMeta(n: NeedsYouItem): string {
  const move = n.from && n.to ? `${TIER_META[n.from].letter} → ${TIER_META[n.to].letter}` : '';
  return [n.dueIn ? `due in ${n.dueIn}` : '', move, n.reason ?? '', n.count ? `${n.count} gaps` : ''].filter(Boolean).join(' · ');
}

export interface FeedRow {
  label: string;
  /** null: unknown (the key/value list draws it dim, never as a word like "ok"). */
  value: string | null;
  /** Drawn in the failure colour. */
  bad?: boolean;
}

/** The Feed section: last poll, status, environments, open CRA items, and (for the deep project) the webhooks. */
export function feedRows(p: FleetProject, deep: DeepProject | null): FeedRow[] {
  const f = p.feed;
  const rows: FeedRow[] = [
    { label: 'Last poll', value: f.ageSec == null ? 'never' : `${formatAge(f.ageSec)} ago` },
    f.ok == null ? { label: 'Status', value: null } : f.ok ? { label: 'Status', value: 'ok' } : { label: 'Status', value: f.error || 'error', bad: true },
  ];
  if (p.env) rows.push({ label: 'Staging', value: p.env.staging }, { label: 'Production', value: p.env.production });
  if (p.craOpen) rows.push({ label: 'CRA open', value: String(p.craOpen) });
  if (deep) rows.push({ label: 'Webhooks', value: deep.webhooks }, { label: 'Unattributed', value: String(deep.unattributed) });
  return rows;
}

/** "3 decisions waiting · last known". */
export function waitingTitle(n: number, stale: boolean): string {
  return `${n} ${n === 1 ? 'decision' : 'decisions'} waiting${stale ? ' · last known' : ''}`;
}

export const gitlabUrl = (path: string): string => `gitlab.example/${path}`;
