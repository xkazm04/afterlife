// How long ago, as one short figure for a dense row ("2d", "5h", "40m", "<1m"), and a UTC stamp a person reads. Pure:
// callers pass `now`, so the server render and the hydrated page agree.

const parsed = (iso: string | null | undefined): number | null => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : t;
};

/** The age of `iso` at `now`, in whole units rounded down; null when unknown. Never "0d": under a minute is "<1m". */
export function shortAge(iso: string | null | undefined, now: Date): string | null {
  const t = parsed(iso);
  if (t === null) return null;
  const min = Math.floor((now.getTime() - t) / 60_000);
  if (min < 1) return '<1m';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

/** "2026-10-21 14:03 UTC"; null when unknown. */
export function utcStamp(iso: string | null | undefined): string | null {
  const t = parsed(iso);
  return t === null ? null : `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
