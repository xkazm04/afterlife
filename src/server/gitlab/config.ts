// Where glab lives and which GitLab/group to talk to. Env only; no token is ever read or kept:
// glab's own keyring login is the credential.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ExecFn } from './adapter/exec';

export interface GitLabConfig {
  /** BELAY_GLAB: path to the glab binary; undefined means find it. */
  glab: string | undefined;
  /** BELAY_GITLAB_HOST: self-managed hostname; undefined means gitlab.com. */
  host: string | undefined;
  /** BELAY_GROUP_ID: the group Belay watches. */
  groupId: string;
}

export const DEFAULT_GROUP_ID = '144060371';

/** A host pasted as a URL ("https://git.example.com/") is its hostname: glab --hostname and every https://<host>/ want that. */
const hostOf = (raw: string | undefined): string | undefined =>
  (raw ?? '').trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '') || undefined;

export function readConfig(env: Record<string, string | undefined> = process.env): GitLabConfig {
  return {
    glab: env.BELAY_GLAB || undefined,
    host: hostOf(env.BELAY_GITLAB_HOST),
    groupId: env.BELAY_GROUP_ID || DEFAULT_GROUP_ID,
  };
}

/** winget installs glab here; a shell opened before the install does not have it on PATH yet. */
export function windowsFallback(env: Record<string, string | undefined> = process.env): string | null {
  const base = env.LOCALAPPDATA;
  return base ? join(base, 'Programs', 'glab', 'glab.exe') : null;
}

/** BELAY_GLAB, else `glab` from PATH, else the winget location. Falls back to plain `glab`. */
export async function resolveGlabBin(
  cfg: GitLabConfig,
  exec: ExecFn,
  env: Record<string, string | undefined> = process.env,
  exists: (p: string) => boolean = existsSync,
): Promise<string> {
  if (cfg.glab) return cfg.glab;
  try {
    const r = await exec('glab', ['--version']);
    if (r.code === 0) return 'glab';
  } catch {
    // not on PATH: try the install location
  }
  const fallback = windowsFallback(env);
  return fallback && exists(fallback) ? fallback : 'glab';
}
