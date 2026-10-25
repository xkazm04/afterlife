// "Your repos": the git toplevels behind ~/.claude/projects, newest session first. Each project dir gives one cwd (its
// newest session's), scratch paths and paths that no longer exist are dropped, and the cwds are folded onto their
// toplevel: a monorepo worked in from five sub-folders is one repo. The listing is kept 60 s in this process, since
// the wizard's page and its re-picks would otherwise re-read 400 dirs and start 400 gits each time.
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ClaudeRepo, ProjectConfig } from '@/schemas/vitals';
import { gitOut, mapLimit, rootKey } from './git';
import { parseRemote } from './remote';
import { firstCwd, isScratchPath, newestJsonl } from './sessions';

const TTL_MS = 60_000;
const GIT_CONCURRENCY = 8;

export const claudeProjectsDir = (): string => process.env.BELAY_CLAUDE_PROJECTS_DIR ?? path.join(os.homedir(), '.claude', 'projects');

/** One live cwd per project dir, with when its newest session was written. */
function sessionCwds(dir: string, scratch: (p: string) => boolean): { cwd: string; mtimeMs: number }[] {
  let subdirs: string[];
  try {
    subdirs = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  const out: { cwd: string; mtimeMs: number }[] = [];
  for (const d of subdirs) {
    const newest = newestJsonl(path.join(dir, d));
    if (!newest) continue;
    const cwd = firstCwd(newest.file);
    if (cwd && !scratch(cwd) && existsSync(cwd)) out.push({ cwd, mtimeMs: newest.mtimeMs });
  }
  return out;
}

/** The display name: the remote's repo name ("Grinex Portal") when there is one, else the folder's. */
const nameOf = (root: string, remote?: string): string => (remote ? parseRemote(remote).repo : undefined) ?? path.basename(root);

/**
 * The listing for a projects dir, uncached; `projects` marks the roots already onboarded. `scratch` is injected only by
 * tests, whose fixture repos live under the temp dir the real filter drops.
 */
export async function scanClaudeRepos(dir: string, projects: readonly ProjectConfig[], scratch: (p: string) => boolean = isScratchPath): Promise<ClaudeRepo[]> {
  const cwds = sessionCwds(dir, scratch);
  const tops = await mapLimit(cwds, GIT_CONCURRENCY, (c) => gitOut(c.cwd, ['rev-parse', '--show-toplevel']));
  const byRoot = new Map<string, { root: string; mtimeMs: number }>();
  cwds.forEach((c, i) => {
    const root = tops[i];
    if (!root || scratch(root)) return;
    const key = rootKey(root);
    const seen = byRoot.get(key);
    if (!seen || c.mtimeMs > seen.mtimeMs) byRoot.set(key, { root: seen?.root ?? root, mtimeMs: Math.max(c.mtimeMs, seen?.mtimeMs ?? 0) });
  });
  const onboarded = new Map(projects.map((p) => [rootKey(p.root), p.slug]));
  const roots = [...byRoot.values()].sort((a, b) => b.mtimeMs - a.mtimeMs);
  return mapLimit(roots, GIT_CONCURRENCY, async ({ root, mtimeMs }) => {
    const [branch, remoteRaw] = await Promise.all([gitOut(root, ['rev-parse', '--abbrev-ref', 'HEAD']), gitOut(root, ['remote', 'get-url', 'origin'])]);
    const remote = remoteRaw ? parseRemote(remoteRaw) : undefined;
    const repo: ClaudeRepo = { root, name: nameOf(root, remoteRaw), lastUsed: new Date(mtimeMs).toISOString(), hostKind: remote?.kind ?? 'none' };
    if (branch) repo.branch = branch;
    if (remote) repo.remote = remote.url;
    const slug = onboarded.get(rootKey(root));
    if (slug) repo.onboarded = slug;
    return repo;
  });
}

let cache: { key: string; at: number; repos: Promise<ClaudeRepo[]> } | undefined;

/** scanClaudeRepos over the person's own projects dir, kept TTL_MS; the onboarded marks are re-read on every call. */
export async function cachedClaudeRepos(projects: readonly ProjectConfig[], now = Date.now()): Promise<ClaudeRepo[]> {
  const dir = claudeProjectsDir();
  if (!cache || cache.key !== dir || now - cache.at > TTL_MS) {
    const repos = scanClaudeRepos(dir, []);
    cache = { key: dir, at: now, repos };
    repos.catch(() => (cache = undefined));
  }
  const onboarded = new Map(projects.map((p) => [rootKey(p.root), p.slug]));
  return (await cache.repos).map((r) => {
    const slug = onboarded.get(rootKey(r.root));
    return slug ? { ...r, onboarded: slug } : r;
  });
}

/** The git toplevel of an absolute path the person picked or pasted, or undefined when it is not inside a repo. */
export async function toplevelOf(p: string): Promise<string | undefined> {
  if (!path.isAbsolute(p) || !existsSync(p)) return undefined;
  return gitOut(p, ['rev-parse', '--show-toplevel']);
}

/** Tests: forget the cached listing. */
export function resetRepoCache(): void {
  cache = undefined;
}
