import type { MaturityRung } from '@/lib/demo';

/** A rung number 0..4, or null for unknown (never treated as zero). */
export type Level = number | null;
export type Mode = 'day0' | 'now' | 'target';

export const MODES: readonly { value: Mode; label: string; title: string }[] = [
  { value: 'day0', label: 'Day 0', title: 'Day 0 high point (D)' },
  { value: 'now', label: 'Now', title: 'Now, as scanned (N)' },
  { value: 'target', label: 'Target', title: 'Next bolt on every route, not earned (T)' },
];

/** "R3", or "?" for unknown. */
export const rungText = (n: Level): string => (n == null ? '?' : `R${n}`);

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** The MR id as the table and the crag tags show it (the policies project is long). */
/** The MR GitLab named for a gap the server opened one for, else the gap's id: never an MR number the screen made up. */
export const mrName = (mrs: Readonly<Record<string, string>>, id: string): string => mrs[id] ?? id;
export const shortMr = (mr: string | null | undefined): string => (mr ?? '').replace('ledgerline-policies', 'pol');

/**
 * The next bolt on a route: one above the current rung once the scan's own next has been reached (a credited gap),
 * otherwise the scan's next. Capped at R4.
 */
export function nextOf(now: Level, scanNext: number): number {
  return now != null && now >= scanNext ? Math.min(4, now + 1) : scanNext;
}

/** The rung a route is drawn at: its Day 0 high point, where it is now, or the next bolt (target, not earned). */
export function levelFor(mode: Mode, base: MaturityRung, now: Level): Level {
  if (mode === 'day0') return base.day0;
  if (mode === 'target') return nextOf(now, base.next);
  return now;
}

/** Deep means R3 enforced or higher: the rope turns green. */
export const isDeep = (lv: Level): boolean => lv != null && lv >= 3;

export interface LevelCounts {
  total: number;
  deep: number;
  running: number;
  configured: number;
  absent: number;
  unknown: number;
}

export function countLevels(levels: readonly Level[]): LevelCounts {
  const n = (f: (v: Level) => boolean) => levels.filter(f).length;
  return {
    total: levels.length,
    deep: n((v) => v != null && v >= 3),
    running: n((v) => v === 2),
    configured: n((v) => v === 1),
    absent: n((v) => v === 0),
    unknown: n((v) => v == null),
  };
}

/** The status bar line, without the unknown count (which the screen draws dashed when above zero). */
export function countsText(c: LevelCounts): string {
  return `${c.total} stages · ${c.deep} deep · ${c.running + c.configured} touched (${c.running} running, ${c.configured} configured) · ${c.absent} absent · `;
}

export function modeLabel(mode: Mode, scannedAt: string): string {
  if (mode === 'day0') return 'Day 0';
  if (mode === 'target') return 'Target · not earned';
  return `Now · scan ${scannedAt}`;
}
