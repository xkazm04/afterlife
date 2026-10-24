// The pure planner behind `npm test`: given what changed, which test files run. No git, no fs, no vitest in here.

export const SOURCE_ROOTS = ['src/', 'engine/', 'runner/', 'cli/', 'gitlab/', 'scripts/'];
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const CODE_FILE = /\.[cm]?[jt]sx?$/;
// Files whose change can move every test: the full suite is the owner's call, never run for them automatically.
const INFRA = /^(?:package(?:-lock)?\.json|vitest\.config\.[cm]?[jt]s|next\.config\.[cm]?[jt]s|eslint\.config\.[cm]?[jt]s|tsconfig[^/]*\.json)$/;

/** Related tests above this share of all test files is a broad change: only their `unit` tier runs. */
export const BROAD_PERCENT = 35;

const norm = (c) => String(typeof c === 'string' ? c : c.path).replace(/\\/g, '/').replace(/^\.\//, '');
const isInfra = (f) => INFRA.test(f) || /(?:^|\/)tsconfig[^/]*\.json$/.test(f);
const isSource = (f) => SOURCE_ROOTS.some((r) => f.startsWith(r)) && CODE_FILE.test(f) && !TEST_FILE.test(f);

/** The changed code files that need an import-graph lookup (deleted ones included: their old importers are still related). */
export function relatedSources(changed) {
  return [...new Set(changed.map(norm).filter(isSource))].sort();
}

/**
 * @param {{ changed: Array<string | { path: string }>, allTests: string[], guards: string[], related?: string[] }} input
 *   `related` is the test files vitest's import graph links to `relatedSources(changed)`.
 * @param {(file: string) => string} [tierOf] a test file's project (`unit` / `db` / `spawn`); asked only on a broad change
 * @returns {{ files: string[], guards: string[], infra: boolean, reason: string, skipped: string[] }}
 *   `skipped` is the related db/spawn tests a broad change leaves out (the full suite is the owner's call).
 */
export function planFor({ changed = [], allTests = [], guards = [], related = [] }, tierOf = () => 'unit') {
  const paths = [...new Set(changed.map(norm))];
  const known = new Set(allTests);
  const own = paths.filter((f) => TEST_FILE.test(f) && known.has(f));
  const linkedAll = [...new Set(related.filter((f) => known.has(f)))];
  const broad = linkedAll.length * 100 > BROAD_PERCENT * allTests.length; // integers: 7 of 20 is exactly 35%, not over
  const linked = broad ? linkedAll.filter((f) => tierOf(f) === 'unit') : linkedAll;
  const skipped = broad ? linkedAll.filter((f) => !linked.includes(f) && !own.includes(f) && !guards.includes(f)).sort() : [];
  const sources = relatedSources(paths);
  const infra = paths.some(isInfra);
  const guardList = [...new Set(guards)].sort();
  const files = [...new Set([...own, ...linked, ...guardList])].sort();
  const parts = [];
  if (infra) parts.push('infra changed');
  if (own.length) parts.push(`${own.length} changed test file${own.length === 1 ? '' : 's'}`);
  if (sources.length) parts.push(`${sources.length} changed source file${sources.length === 1 ? '' : 's'} (${linkedAll.length} related${broad ? `, ${linked.length} of them unit` : ''})`);
  if (!parts.length) parts.push(paths.length ? `${paths.length} changed file${paths.length === 1 ? '' : 's'} with no related tests` : 'nothing changed');
  return { files, guards: guardList, infra, reason: parts.join(', '), skipped };
}
