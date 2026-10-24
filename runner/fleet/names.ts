// A fleet repo's slug and base, by one rule for the runner's loader (load.ts) and the screens' reader
// (src/server/runs/readFleet.ts): a file the runner refuses is never one the screens call ok.

/** A lowercase token: it names the repo's lanes, branches and run folders. */
export const FLEET_SLUG = /^[a-z0-9][a-z0-9._-]*$/;

/** A git ref or sha. It reaches git argv (rev-parse, worktree add): a leading '-' would be read as an option. */
export const FLEET_BASE = /^[A-Za-z0-9_][A-Za-z0-9._/~^@{}-]*$/;

/** Why a repo's slug or base is refused, or null when both are fine. */
export function fleetRefProblem(slug: unknown, base: unknown): string | null {
  if (typeof slug !== 'string' || !FLEET_SLUG.test(slug)) return 'slug must be a lowercase token';
  if (typeof base !== 'string' || !FLEET_BASE.test(base)) return 'base must be a git ref or sha';
  return null;
}
