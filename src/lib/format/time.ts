// Pure time formatting for feed ages, countdowns and clocks. No Date.now() in here: callers pass seconds.

/**
 * Feed age as the Fleet shows it: "12 s", "40 m", "1.5 h", "2.1 d"; null (never polled) is an em dash. A unit is picked
 * by the rounded figure, so 59.6 s reads "1 m" and 23.97 h reads "1 d", never "60 s" or "24 h".
 */
export function formatAge(sec: number | null | undefined): string {
  if (sec == null) return '—';
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s} s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} m`;
  const h = Math.round(sec / 360) / 10;
  if (h < 24) return `${h} h`;
  return `${Math.round(sec / 8640) / 10} d`;
}

export function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

/** Split whole seconds into days/hours/minutes/seconds (negative clamps to zero). */
export function splitDuration(totalSec: number): { d: number; h: number; m: number; s: number } {
  const t = Math.max(0, Math.floor(totalSec));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/** Hours may pass 24: "19:11:59", "49:00:05". */
export function formatClock(totalSec: number): string {
  const t = Math.max(0, Math.floor(totalSec));
  return `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor((t % 3600) / 60))}:${pad2(t % 60)}`;
}
