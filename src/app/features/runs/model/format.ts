// The words for a run's figures. An absent figure is a dash, never 0: "no usage reported" and "cost nothing" differ.
export const DASH = '-';

export const usd = (n: number | undefined): string => (n === undefined ? DASH : `$${n.toFixed(2)}`);

export function tokens(n: number | undefined): string {
  if (n === undefined) return DASH;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function wall(sec: number | undefined): string {
  if (sec === undefined) return DASH;
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m ${Math.round(sec % 60)}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export const pct = (n: number | undefined): string => (n === undefined ? DASH : `${Math.round(n * 100)}%`);

/** "2 landed, 1 parked": only the outcomes that happened, then lanes still open. */
export function outcomeWords(c: Record<string, number>, open: number): string {
  const parts = Object.entries(c).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
  if (open > 0) parts.push(`${open} open`);
  return parts.length ? parts.join(', ') : DASH;
}

/** The commands a person runs to take a mergeable wave; text only, nothing here runs them. */
export const mergeCommands = (repo: string, branch: string): string[] => [`git -C ${repo} merge --ff-only ${branch}`, `git -C ${repo} push`];
