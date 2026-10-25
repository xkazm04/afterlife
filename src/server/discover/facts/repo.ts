// The repo's manifests and its candidate components: package.json scripts, pyproject's pytest and script tables, the
// requirements files, and each top-level dir that has its own README or tests (release-log inside Grinex Portal).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export interface Manifests {
  packageScripts?: Record<string, string>;
  pyproject?: string[];
  requirements?: string[];
}

export interface DirFacts {
  path: string;
  readme?: string;
  tests: string[];
  packageScripts?: Record<string, string>;
  pyproject?: boolean;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'logs', 'uploads', 'vendor', '__pycache__', 'venv', '.venv']);
const TEST_DIR = /^(tests?|__tests__|e2e|spec)$/i;
const TEST_FILE = /(^test_.*\.py$|_test\.py$|\.(test|spec)\.[cm]?[jt]sx?$)/i;

const read = (p: string): string | undefined => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return undefined;
  }
};

function scripts(dir: string): Record<string, string> | undefined {
  const raw = read(path.join(dir, 'package.json'));
  if (!raw) return undefined;
  try {
    const s = (JSON.parse(raw) as { scripts?: unknown }).scripts;
    if (typeof s !== 'object' || s === null) return undefined;
    const out = Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === 'string').slice(0, 30).map(([k, v]) => [k, (v as string).slice(0, 160)]));
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

/** pyproject's [tool.pytest*], [project.scripts] and [tool.poetry.scripts] tables, a few lines each. */
function pyproject(dir: string): string[] | undefined {
  const raw = read(path.join(dir, 'pyproject.toml'));
  if (!raw) return undefined;
  const out: string[] = [];
  let keep = false;
  let n = 0;
  for (const l of raw.split(/\r?\n/)) {
    if (/^\[/.test(l)) {
      keep = /^\[(tool\.pytest[^\]]*|project\.scripts|tool\.poetry\.scripts)\]/.test(l);
      n = 0;
    }
    if (keep && l.trim() && n++ < 12) out.push(l.slice(0, 160));
  }
  return out.length ? out : undefined;
}

export function manifests(root: string): Manifests {
  const out: Manifests = {};
  const s = scripts(root);
  if (s) out.packageScripts = s;
  const py = pyproject(root);
  if (py) out.pyproject = py;
  const req = readdirSync(root).filter((f) => /^requirements.*\.(txt|in|lock)$/i.test(f)).sort();
  if (req.length) out.requirements = req;
  return out;
}

const testFilesIn = (dir: string): number => {
  try {
    return readdirSync(dir).filter((f) => TEST_FILE.test(f)).length;
  } catch {
    return 0;
  }
};

/** Test dirs and up to five test files right under a dir, and each sub-folder that holds test files ("tool/ (12 test files)"). */
function testsIn(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && TEST_DIR.test(e.name)) out.push(`${e.name}/`);
    else if (e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name)) {
      const n = testFilesIn(path.join(dir, e.name));
      if (n) out.push(`${e.name}/ (${n} test files)`);
    } else if (e.isFile() && TEST_FILE.test(e.name) && out.length < 6) out.push(e.name);
  }
  return out.sort().slice(0, 10);
}

const firstHeading = (p: string): string | undefined => read(p)?.split(/\r?\n/).find((l) => l.trim())?.replace(/^#+\s*/, '').slice(0, 120);

/** Top-level dirs with their own README, tests or manifest: the parts a monorepo may be watched by. At most 30. */
export function componentDirs(root: string): DirFacts[] {
  const out: DirFacts[] = [];
  for (const e of readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const dir = path.join(root, e.name);
    let tests: string[];
    try {
      tests = testsIn(dir);
    } catch {
      continue;
    }
    const readme = ['README.md', 'readme.md', 'README'].map((f) => path.join(dir, f)).find((p) => existsSync(p) && statSync(p).isFile());
    const pkg = scripts(dir);
    const py = existsSync(path.join(dir, 'pyproject.toml'));
    if (!readme && !tests.length && !pkg && !py) continue;
    const d: DirFacts = { path: e.name, tests };
    const h = readme ? firstHeading(readme) : undefined;
    if (h) d.readme = h;
    if (pkg) d.packageScripts = pkg;
    if (py) d.pyproject = true;
    out.push(d);
    if (out.length >= 30) break;
  }
  return out;
}
