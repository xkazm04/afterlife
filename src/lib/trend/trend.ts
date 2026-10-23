// The fleet's week over week: one row per project per UTC day (the index's append-only fleet_day; the demo seeds its
// own), folded into a scope's daily series and its change against the same day a week before. Pure and client-safe, so
// the server's writer and every screen read the same arithmetic. null = unknown, never 0.

/** One project on one UTC day, as the fleet showed it after that day's first poll. */
export interface FleetDayRow {
  /** YYYY-MM-DD, UTC. */
  day: string;
  projectId: string;
  /** The project's Fleet group. null: none recorded. */
  groupPath: string | null;
  /** Decisions waiting, as the group sum counts them (an unwatched project's are not counted). */
  needs: number;
  stale: boolean;
  /** Classes at hands-off. null: the project's tiers were unknown. */
  handsOff: number | null;
  /** Proofs of the 7 days before (pass + fail + inconclusive). null: unknown. */
  proofs7d: number | null;
  /** The agent MRs' red pipeline rate. null: not read, or none final. */
  redRate: number | null;
  /** The cycle runner's recorded spend. null: not metered. */
  costUsd: number | null;
}

/** One day of a scope: its projects summed. */
export interface TrendPoint {
  day: string;
  needs: number;
  stale: number;
  /** Over the projects whose tiers were known that day; null when none was. */
  handsOff: number | null;
}

/** A scope's trend: how many days are recorded, today's change against 7 days before, and the daily series (oldest first). */
export interface Trend {
  days: number;
  /** null: no row 7 days before the current one (or no rows at all). */
  delta: { needs: number | null; stale: number | null; handsOff: number | null };
  series: TrendPoint[];
}

/** What a screen is handed: the rows, the server's today, and whether they are the demo's seeded history. */
export interface TrendFeed {
  rows: readonly FleetDayRow[];
  today: string;
  seeded: boolean;
}

/** How many days the trend keeps on screen. */
export const TREND_DAYS = 28;
/** The delta's look-back, in days. */
export const WEEK = 7;

/** A Date's UTC day, YYYY-MM-DD. */
export const utcDay = (d: Date): string => d.toISOString().slice(0, 10);

/** A YYYY-MM-DD day moved by n days (UTC). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return utcDay(d);
}

const inScope = (r: FleetDayRow, scope: { project?: string; group?: string }): boolean =>
  (scope.project === undefined || r.projectId === scope.project) && (scope.group === undefined || r.groupPath === scope.group);

/**
 * The scope's trend (a project, a group, or the whole fleet when neither is given). The current row is today's, else the
 * newest; the delta is against the row 7 days before it, null when that day has no row.
 */
export function trendOf(days: readonly FleetDayRow[], today: string, scope: { project?: string; group?: string } = {}): Trend {
  const byDay = new Map<string, TrendPoint>();
  for (const r of days) {
    if (!inScope(r, scope)) continue;
    const p = byDay.get(r.day) ?? { day: r.day, needs: 0, stale: 0, handsOff: null };
    p.needs += r.needs;
    p.stale += r.stale ? 1 : 0;
    if (r.handsOff !== null) p.handsOff = (p.handsOff ?? 0) + r.handsOff;
    byDay.set(r.day, p);
  }
  const series = [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const cur = byDay.get(today) ?? series.at(-1);
  const base = cur ? byDay.get(addDays(cur.day, -WEEK)) : undefined;
  const diff = (a: number | null | undefined, b: number | null | undefined): number | null => (a == null || b == null ? null : a - b);
  return {
    days: series.length,
    delta: { needs: diff(cur?.needs, base?.needs), stale: diff(cur?.stale, base?.stale), handsOff: diff(cur?.handsOff, base?.handsOff) },
    series,
  };
}

/** Whether the trend has a week to compare against (needs is never unknown on a recorded day, so its delta says). */
export const trendReady = (t: Trend): boolean => t.delta.needs !== null;

/** "+2", "-1", "0": a known change, signed. */
export const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** The live empty state, in words. */
export const pendingLine = (days: number): string => `trend starts after ${WEEK} days of polling (${days} so far)`;

/** "since last week: +2 waiting · +1 stale"; not ready: the pending line. */
export function sinceLastWeek(t: Trend): string {
  const { needs, stale } = t.delta;
  if (needs === null) return pendingLine(t.days);
  return `since last week: ${signed(needs)} waiting${stale === null ? '' : ` · ${signed(stale)} stale`}`;
}
