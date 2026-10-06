// Display strings the demo shapes carry. Times are UTC (the index has no notion of the operator's zone yet).

const pad = (n: number): string => String(n).padStart(2, '0');

/** "14:21". */
export const clock = (d: Date): string => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

/** How long ago, as "4 min", "3 h" or "5 d" (no "ago": the callers add their own wording). */
export function ageText(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h` : `${Math.floor(h / 24)} d`;
}

/** Time left, "19 h 12 m" or "7 m"; "overdue" once the deadline has passed. */
export function countdown(ms: number): string {
  if (ms <= 0) return 'overdue';
  const total = Math.floor(ms / 60_000);
  const h = Math.floor(total / 60);
  return h > 0 ? `${h} h ${total % 60} m` : `${total} m`;
}

/** Whole days left, rounded up; 0 once passed. */
export const daysLeft = (ms: number): number => Math.max(0, Math.ceil(ms / 86_400_000));
