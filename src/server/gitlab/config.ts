// Where glab lives and which GitLab/group to talk to. The env (AFTERLIFE_<KEY>, read through envOf) with /start's runtime
// settings under it (serverEnv); no token is ever read or kept: glab's own keyring login is the credential.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { envOf, serverEnv } from '@/server/env/env';
import type { ExecFn } from './adapter/exec';

export interface GitLabConfig {
  /** AFTERLIFE_GLAB: path to the glab binary; undefined means find it. */
  glab: string | undefined;
  /** AFTERLIFE_GITLAB_HOST: self-managed hostname; undefined means gitlab.com. */
  host: string | undefined;
  /** AFTERLIFE_GROUP_ID: the group Afterlife watches. */
  groupId: string;
}

export const DEFAULT_GROUP_ID = '144060371';

/** A host pasted as a URL ("https://git.example.com/") is its hostname: glab --hostname and every https://<host>/ want that. */
const hostOf = (raw: string | undefined): string | undefined =>
  (raw ?? '').trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '') || undefined;

export function readConfig(env: Record<string, string | undefined> = serverEnv()): GitLabConfig {
  return {
    glab: envOf(env, 'GLAB'),
    host: hostOf(envOf(env, 'GITLAB_HOST')),
    groupId: envOf(env, 'GROUP_ID') || DEFAULT_GROUP_ID,
  };
}

/** winget installs glab here; a shell opened before the install does not have it on PATH yet. */
export function windowsFallback(env: Record<string, string | undefined> = process.env): string | null {
  const base = env.LOCALAPPDATA;
  return base ? join(base, 'Programs', 'glab', 'glab.exe') : null;
}

/** AFTERLIFE_GLAB, else `glab` from PATH, else the winget location. Falls back to plain `glab`. */
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
