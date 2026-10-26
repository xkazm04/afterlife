// Which files of a checkout the rules look at. In a git checkout the list is git's own (tracked files and untracked ones
// git does not ignore): exact, fast, and no node_modules. Elsewhere the folders are walked. Either way past a limit the
// checkout is read in part, and the scan says so.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AZURE, GITHUB } from './pipelines/read';

// .belay/, .belay-engine/, .belay-policy/: wire names, the CI jobs' work dirs that targets gitignore; .afterlife/ is the data dir.
const SKIP = new Set(['.git', 'node_modules', '.afterlife', '.belay', '.belay-engine', '.belay-policy', 'vendor', 'dist', 'build', '.next']);
const WANT = /^(\.gitlab\/.+|(docs\/)?CODEOWNERS|.+\.(tf|bicep)|(.+\/)?azuredeploy[^/]*\.json|(.+\/)?prometheus[^/]*\.ya?ml|alerts?\/.+\.ya?ml)$/;
const CONTENT = /alerting|prometheus|^alerts?\//;
const wanted = (rel: string): boolean => WANT.test(rel) || AZURE.test(rel) || GITHUB.test(rel);

/** How far the reading goes: files (git's list) or entries (a walk), and a walk's depth. */
export interface WalkLimits {
  files: number;
  depth: number;
}
export const LIMITS: WalkLimits = { files: 200_000, depth: 8 };

export interface Listed {
  files: Record<string, string | null>;
  /** Why some files were not seen; null: every one was. */
  gap: string | null;
}

const posix = (p: string): string => p.split(path.sep).join('/');
const same = (a: string, b: string): boolean => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);

/** git's file list when `root` is the top of a work tree, else null. fsmonitor is off: a scan runs no hook of the repo. */
function gitList(root: string): string[] | null {
  const git = (args: string[]): string =>
    execFileSync('git', ['-c', 'core.fsmonitor=false', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
  try {
    const top = git(['rev-parse', '--show-toplevel']).trim();
    if (!same(fs.realpathSync.native(top), fs.realpathSync.native(root))) return null;
    return [...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))];
  } catch {
    return null;
  }
}

function keep(root: string, rel: string, files: Record<string, string | null>, unreadable: string[]): void {
  try {
    files[rel] = CONTENT.test(rel) ? fs.readFileSync(path.join(root, rel), 'utf8') : null;
  } catch {
    unreadable.push(rel);
  }
}

function fromGit(root: string, list: string[], limits: WalkLimits): Listed {
  const files: Record<string, string | null> = {};
  const unreadable: string[] = [];
  for (const rel of list.slice(0, limits.files)) {
    if (!wanted(rel) || rel.split('/').some((s) => SKIP.has(s))) continue;
    // a tracked file deleted in the working tree is not in the checkout
    if (fs.statSync(path.join(root, rel), { throwIfNoEntry: false })?.isFile()) keep(root, rel, files, unreadable);
  }
  return { files, gap: gapOf(list.length > limits.files ? `git's file list was read up to ${limits.files} of ${list.length} files` : '', unreadable) };
}

function walked(root: string, limits: WalkLimits): Listed {
  const files: Record<string, string | null> = {};
  const unreadable: string[] = [];
  let seen = 0;
  let cut = false;
  const visit = (dir: string, depth: number): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      unreadable.push(posix(path.relative(root, dir)) || '.');
      return;
    }
    for (const e of entries) {
      if (seen >= limits.files) {
        cut = true;
        return;
      }
      seen++;
      const abs = path.join(dir, e.name);
      const rel = posix(path.relative(root, abs));
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        if (depth >= limits.depth) cut = true;
        else visit(abs, depth + 1);
      } else if (e.isFile() && wanted(rel)) keep(root, rel, files, unreadable);
    }
  };
  visit(root, 0);
  return { files, gap: gapOf(cut ? `the walk stopped at ${limits.files} entries or ${limits.depth} levels deep` : '', unreadable) };
}

function gapOf(cut: string, unreadable: string[]): string | null {
  const why = [
    cut,
    unreadable.length ? `${unreadable.length} path(s) could not be read (${unreadable.slice(0, 3).join(', ')}${unreadable.length > 3 ? ', ...' : ''})` : '',
  ].filter(Boolean);
  return why.length ? `part of the checkout was not read: ${why.join('; ')}` : null;
}

/** The wanted files of a checkout, from git's list when it is a git work tree's top, else by a walk. */
export function listFiles(root: string, limits: WalkLimits = LIMITS): Listed {
  const list = gitList(root);
  return list ? fromGit(root, list, limits) : walked(root, limits);
}
