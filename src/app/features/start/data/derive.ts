// What a repo's `origin` says about its GitLab home: the host, the namespace (the group to watch) and the project path, from
// the remote URL as server/discover parses it (userinfo dropped), then the namespace's numeric id from one read through
// the gitlab adapter with glab as the app resolves it. A remote that is not on GitLab (github.com, Azure DevOps) answers
// nulls with the reason; so does a group glab cannot read. A self-managed host counts as GitLab when it is the one the
// server is configured for, or its name says gitlab.
import 'server-only';
import { serverEnv } from '@/server/env/env';
import { createGlabAdapter, defaultExec, readConfig, resolveGlabBin } from '@/server/gitlab';
import { defaultExec as runCli } from '@/server/providers/exec';
import { parseRemote } from '@/server/discover/repos/remote';
import { messageOf } from '@/lib/format/error';
import type { DeriveAnswer } from '@/server/start/wire';

export interface DeriveDeps {
  /** `git remote get-url origin` in the repo; null when it has none. */
  remote: (root: string) => Promise<string | null>;
  /** The namespace's numeric id on `host`. Throws with the reason when it cannot be read. */
  groupId: (host: string, path: string) => Promise<string>;
  /** The GitLab host the server is configured for (gitlab.com by default). */
  host: string;
}

export function deriveDeps(env = serverEnv()): DeriveDeps {
  const cfg = readConfig(env);
  return {
    host: cfg.host ?? 'gitlab.com',
    remote: async (root) => {
      const r = await runCli('git', ['-C', root, 'remote', 'get-url', 'origin'], { timeoutMs: 15_000 });
      return r.code === 0 && r.stdout.trim() ? r.stdout.trim() : null;
    },
    groupId: async (host, path) => {
      const bin = await resolveGlabBin(cfg, defaultExec);
      const port = createGlabAdapter({ bin, host: host === 'gitlab.com' ? undefined : host, exec: defaultExec });
      return String((await port.getGroup(path)).id);
    },
  };
}

/** The host and path of a clone URL: `https://host[:port]/a/b(.git)` and `git@host:a/b(.git)`; null for anything else. */
export function hostPathOf(url: string): { host: string; path: string } | null {
  const web = /^[a-z][a-z0-9+.-]*:\/\/([^/]+)\/(.+)$/i.exec(url);
  const scp = web ? null : /^[^@/\s]+@([^:/\s]+):(.+)$/.exec(url);
  const m = web ?? scp;
  if (!m) return null;
  const path = (m[2] ?? '').replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
  return { host: (m[1] ?? '').replace(/^[^@]*@/, '').replace(/:\d+$/, '').toLowerCase(), path };
}

export async function deriveFor(root: string, deps: DeriveDeps): Promise<DeriveAnswer> {
  const none = (host: string, reason: string): DeriveAnswer => ({ host, groupPath: null, groupId: null, projectPath: null, reason });
  const raw = await deps.remote(root);
  if (!raw) return none(deps.host, 'the repo has no origin remote: add one, or type the group id');
  const remote = parseRemote(raw);
  const at = hostPathOf(remote.url);
  if (!at) return none(deps.host, `the origin remote is not a URL Afterlife reads: ${remote.url}`);
  const onGitLab = remote.kind === 'gitlab' || at.host === deps.host.toLowerCase();
  if (!onGitLab) return none(at.host, `the origin remote is on ${at.host}, not on GitLab`);
  const parts = at.path.split('/').filter(Boolean);
  if (parts.length < 2) return none(at.host, `the remote names no group: ${remote.url}`);
  const projectPath = parts.join('/');
  const groupPath = parts.slice(0, -1).join('/');
  try {
    return { host: at.host, groupPath, projectPath, groupId: await deps.groupId(at.host, groupPath) };
  } catch (e) {
    return { host: at.host, groupPath, projectPath, groupId: null, reason: `glab could not read the group ${groupPath}: ${messageOf(e, { firstLine: true })}` };
  }
}
