// The pure planner behind `npm test`: given what changed, which test files run. No git, no fs, no vitest in here.

export const SOURCE_ROOTS = ['src/', 'engine/', 'runner/', 'cli/', 'gitlab/', 'scripts/'];
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const CODE_FILE = /\.[cm]?[jt]sx?$/;
// Files whose change can move every test: the full suite is the owner's call, never run for them automatically.
const INFRA = /^(?:package(?:-lock)?\.json|vitest\.config\.[cm]?[jt]s|next\.config\.[cm]?[jt]s|eslint\.config\.[cm]?[jt]s|tsconfig[^/]*\.json)$/;

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
 * @returns {{ files: string[], guards: string[], infra: boolean, reason: string }}
 */
export function planFor({ changed = [], allTests = [], guards = [], related = [] }) {
  const paths = [...new Set(changed.map(norm))];
  const known = new Set(allTests);
  const own = paths.filter((f) => TEST_FILE.test(f) && known.has(f));
  const linked = related.filter((f) => known.has(f));
  const sources = relatedSources(paths);
  const infra = paths.some(isInfra);
  const guardList = [...new Set(guards)].sort();
  const files = [...new Set([...own, ...linked, ...guardList])].sort();
  const parts = [];
  if (infra) parts.push('infra changed');
  if (own.length) parts.push(`${own.length} changed test file${own.length === 1 ? '' : 's'}`);
  if (sources.length) parts.push(`${sources.length} changed source file${sources.length === 1 ? '' : 's'} (${linked.length} related)`);
  if (!parts.length) parts.push(paths.length ? `${paths.length} changed file${paths.length === 1 ? '' : 's'} with no related tests` : 'nothing changed');
  return { files, guards: guardList, infra, reason: parts.join(', ') };
}
