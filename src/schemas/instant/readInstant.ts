// The one reader of a hand-written instant in tier-state.yml (cooldown_until, lease_expires). ECMAScript reads a date-time
// with no offset in the LOCAL zone, so the same file would end a cooldown at different moments on different hosts; here
// a date-time with no zone is UTC, as a date-only value already is.

const ZONELESS = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;

/** Epoch milliseconds of `text`, or NaN when it is not a readable instant. A zone-less date-time is read as UTC. */
export function readInstant(text: string): number {
  const t = text.trim();
  const m = ZONELESS.exec(t);
  return Date.parse(m ? `${m[1]}T${m[2]}Z` : t);
}
