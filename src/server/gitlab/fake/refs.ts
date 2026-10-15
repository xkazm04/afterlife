// Refs of the fake: the default branch is the project's own `files`; every other branch a write made is its own tree,
// copied from the branch it started from, so a commit to belay/* changes nothing on main until a merge (merge.ts).
import { createHash } from 'node:crypto';
import { FAKE_SEED_AT, type BranchTree, type FakeState, type FileCommit, type ProjectData, type Tree } from './dataset';

const nowIso = (): string => new Date().toISOString();

/** GitLab's last_commit_id of a file: the commit the fake's last write of it made, else one derived from its content. */
export const lastCommitOf = (t: Tree, path: string): string =>
  t.fileCommits?.[path] ?? createHash('sha1').update(`commit\0${path}\0${t.files[path] ?? ''}`).digest('hex');

/** A file's commits, oldest first: its history, or (a file no write touched) the one seeded commit its id is derived from. */
export const commitsOf = (t: Tree, path: string): FileCommit[] =>
  t.history?.[path] ?? (t.files[path] === undefined ? [] : [{ id: lastCommitOf(t, path), at: FAKE_SEED_AT, title: 'seed', content: t.files[path] ?? '' }]);

export const defaultBranch = (p: ProjectData): string => (typeof p.raw.default_branch === 'string' ? p.raw.default_branch : 'main');

/** The tree a branch name reads: the default branch, a branch's own tree, a head a test set (the default tree), else none. */
export function treeAt(p: ProjectData, ref: string | null | undefined): Tree | null {
  if (!ref || ref === defaultBranch(p)) return p;
  return p.refs?.[ref] ?? (p.branches?.[ref] !== undefined ? p : null);
}

/** Every tree of the project, the default branch first: a read at a commit id looks for it in each. */
export const allTrees = (p: ProjectData): Tree[] => [p, ...Object.values(p.refs ?? {})];

/** A new branch: a copy of `from` that remembers each file's last commit there, so a merge can tell who changed what. */
function fork(p: ProjectData, name: string, from: Tree): BranchTree {
  const t: BranchTree = {
    files: { ...from.files }, fileCommits: { ...from.fileCommits }, history: structuredClone(from.history ?? {}),
    forked: Object.fromEntries(Object.keys(from.files).map((f) => [f, lastCommitOf(from, f)])),
  };
  (p.refs ??= {})[name] = t;
  return t;
}

/**
 * Where a file write lands. `read` is the tree GitLab checks the write against: the branch's own tree when it has one (and
 * `force` is not restarting it), else `start_branch` (default: the default branch). `tree()` forks the branch from it on
 * the first write. null: the start branch names nothing.
 */
export function writeTarget(p: ProjectData, f: Record<string, string>): { read: Tree; tree: () => Tree } | null {
  const def = defaultBranch(p);
  const branch = f.branch ?? def;
  if (branch === def) return { read: p, tree: () => p };
  const own = p.refs?.[branch];
  const restart = f.start_branch !== undefined && f.start_branch !== branch && f.force === 'true';
  if (own && !restart) return { read: own, tree: () => own };
  const from = treeAt(p, f.start_branch ?? def);
  return from ? { read: from, tree: () => fork(p, branch, from) } : null;
}

/**
 * A file write is a commit: the content changes, and so does the file's last_commit_id. The file's history keeps each
 * commit with its content (the seeded content first), for the commit list and reads at a commit. Returns the commit id.
 */
export function writeFile(t: Tree, path: string, content: string, st: FakeState, title = ''): string {
  const history = ((t.history ??= {})[path] ??= []);
  const before = t.files[path];
  if (!history.length && before !== undefined) history.push({ id: lastCommitOf(t, path), at: FAKE_SEED_AT, title: 'seed', content: before });
  t.files[path] = content;
  const commit = createHash('sha1').update(`commit ${st.nextId++}`).digest('hex');
  history.push({ id: commit, at: nowIso(), title, content });
  (t.fileCommits ??= {})[path] = commit;
  return commit;
}
