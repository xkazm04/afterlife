// Runtime settings: the few values /start sets without a restart (the group, host, mode, deep project, proof authors),
// kept in <data dir>/settings.json. An absent value is an omitted key, never null or "". The env always wins (env.ts).
// STUB (spark afterlife-onboard-wizard, WP-B implements): signatures are final.
import type { Env } from './env';

export interface RuntimeSettings {
  groupId?: string;
  host?: string;
  mode?: 'demo' | 'live';
  project?: string;
  proofAuthors?: string;
}

/** Each setting and the env key it stands in for (AFTERLIFE_<key> / BELAY_<key>). */
export const SETTING_KEYS: readonly (readonly [keyof RuntimeSettings, string])[] = [
  ['groupId', 'GROUP_ID'],
  ['host', 'GITLAB_HOST'],
  ['mode', 'MODE'],
  ['project', 'PROJECT'],
  ['proofAuthors', 'PROOF_AUTHORS'],
];

/** The settings file, read fresh; a missing or unreadable file is no settings. */
export function readSettings(_env?: Env): RuntimeSettings {
  return {};
}

/** Merge `patch` into the settings file (a key set to undefined is removed) and return the new settings. */
export function writeSettings(_patch: Partial<RuntimeSettings>, _env?: Env): RuntimeSettings {
  throw new Error('writeSettings: not built yet (WP-B)');
}
