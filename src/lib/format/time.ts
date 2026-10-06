// Pure time formatting for feed ages, countdowns and clocks. No Date.now() in here: callers pass seconds.

/** Feed age as the Fleet shows it: "12 s", "40 m", "1.5 h", "2.1 d"; null (never polled) is an em dash. */
export function formatAge(sec: number | null | undefined): string {
  if (sec == null) return '—';
  if (sec < 60) return `${Math.max(0, Math.round(sec))} s`;
  if (sec < 3600) return `${Math.round(sec / 60)} m`;
  if (sec < 86400) return `${Math.round(sec / 360) / 10} h`;
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

/** Countdown as prose: "19 h 12 m", "2 d 19 h", "45 s". Shows the two largest non-zero units. */
export function formatDuration(totalSec: number): string {
  const { d, h, m, s } = splitDuration(totalSec);
  const parts: string[] = [];
  if (d) parts.push(`${d} d`);
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} m`);
  if (!parts.length) parts.push(`${s} s`);
  return parts.slice(0, 2).join(' ');
}

/** Hours may pass 24: "19:11:59", "49:00:05". */
export function formatClock(totalSec: number): string {
  const t = Math.max(0, Math.floor(totalSec));
  return `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor((t % 3600) / 60))}:${pad2(t % 60)}`;
}
