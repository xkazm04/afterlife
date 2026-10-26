// The server's environment under the product's name. AFTERLIFE_<KEY> is the name; BELAY_<KEY> is still read as a
// deprecated fallback, so an operator's existing shell and CI keep working. An empty value counts as unset, as `||` did.
// serverEnv() lays the runtime settings (settings.ts, written by /start) under it: a variable set in either name wins.
import { readSettings, SETTING_KEYS } from './settings';

export type Env = Record<string, string | undefined>;

/** AFTERLIFE_<key>, else BELAY_<key>, else undefined. */
export function envOf(env: Env, key: string): string | undefined {
  return env[`AFTERLIFE_${key}`] || env[`BELAY_${key}`] || undefined;
}

/** Which name set a key: the env (either name), a runtime setting, or nothing. */
export type ValueSource = 'env' | 'setting' | 'unset';

/** process.env with each runtime setting filled in as AFTERLIFE_<key> where neither env name is set. */
export function serverEnv(env: Env = process.env): Env {
  const s = readSettings(env);
  const out: Env = { ...env };
  for (const [field, key] of SETTING_KEYS) {
    const v = s[field];
    if (v !== undefined && !envOf(env, key)) out[`AFTERLIFE_${key}`] = v;
  }
  return out;
}

export function sourceOf(env: Env, key: string): ValueSource {
  if (envOf(env, key)) return 'env';
  const field = SETTING_KEYS.find(([, k]) => k === key)?.[0];
  return field && readSettings(env)[field] !== undefined ? 'setting' : 'unset';
}
