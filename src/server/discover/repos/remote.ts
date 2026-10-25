// What a git remote URL says about where the code is hosted. Pure, so a table test pins it. The userinfo a clone URL
// may carry (https://Grinex@dev.azure.com/..., or a token) is dropped before anything is shown or saved.
import type { Host, HostKind } from '@/schemas/vitals';

export interface Remote extends Host {
  /** The URL without its userinfo. */
  url: string;
}

const dec = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const trimGit = (s: string): string => s.replace(/\.git$/i, '').replace(/\/+$/, '');

/** The URL with no `user[:secret]@` before the host. scp-style `git@host:path` keeps its `git@`: it names no secret. */
export function scrubRemote(url: string): string {
  return url.trim().replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i, '$1');
}

export function hostKindOf(url: string): HostKind {
  const u = url.toLowerCase();
  if (u.includes('dev.azure.com') || u.includes('visualstudio.com')) return 'azure-devops';
  if (u.includes('gitlab')) return 'gitlab';
  if (u.includes('github')) return 'github';
  return 'none';
}

/** The host, path and kind of a remote: `https://host/a/b` and `git@host:a/b` both give host and `a/b`. */
function split(url: string): { host: string; path: string } | null {
  const web = /^[a-z][a-z0-9+.-]*:\/\/([^/]+)\/(.+)$/i.exec(url);
  if (web) return { host: (web[1] ?? '').replace(/:\d+$/, '').toLowerCase(), path: trimGit(web[2] ?? '') };
  const scp = /^[^@/\s]+@([^:/\s]+):(.+)$/.exec(url);
  if (scp) return { host: (scp[1] ?? '').toLowerCase(), path: trimGit(scp[2] ?? '') };
  return null;
}

function azure(host: string, parts: string[]): Pick<Host, 'org' | 'project' | 'repo'> {
  // https://dev.azure.com/{org}/{project}/_git/{repo}, git@ssh.dev.azure.com:v3/{org}/{project}/{repo},
  // https://{org}.visualstudio.com/[DefaultCollection/]{project}/_git/{repo}
  if (host.endsWith('visualstudio.com')) {
    const rest = parts[0]?.toLowerCase() === 'defaultcollection' ? parts.slice(1) : parts;
    const at = rest.indexOf('_git');
    return { org: host.split('.')[0], project: rest[0], repo: at >= 0 ? rest[at + 1] : undefined };
  }
  const rest = parts[0] === 'v3' ? parts.slice(1) : parts;
  const at = rest.indexOf('_git');
  return { org: rest[0], project: rest[1], repo: at >= 0 ? rest[at + 1] : rest[2] };
}

/** Host fields for a remote; a field the URL does not name is left out. */
export function parseRemote(raw: string): Remote {
  const url = scrubRemote(raw);
  const kind = hostKindOf(url);
  const s = split(url);
  const out: Remote = { kind, url };
  if (!s) return out;
  const parts = s.path.split('/').filter(Boolean).map(dec);
  if (kind === 'azure-devops') {
    for (const [k, v] of Object.entries(azure(s.host, parts))) if (v) out[k as 'org' | 'project' | 'repo'] = v;
  } else if (kind === 'gitlab' || kind === 'github') {
    if (parts.length >= 2) out.path = parts.join('/');
    const repo = parts.at(-1);
    if (repo) out.repo = repo;
  }
  return out;
}
