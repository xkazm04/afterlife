// Runtime settings: the few values /start sets without a restart (the group, host, mode, deep project, proof authors),
// kept in <data dir>/settings.json. An absent value is an omitted key, never null or "". The env always wins (env.ts).
// The file is read fresh on every call (it is a few bytes) and validated field by field: a hand edit that breaks a value
// drops that value, never the file. Written to a temp file and renamed, so a reader never sees half of it.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { envOf, type Env } from './env';

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

/** `<root>/.afterlife`, unless only the pre-rename `<root>/.belay` exists: an existing index, runs and vitals are never stranded. */
export function dotDirAt(root: string): string {
  const now = path.join(root, '.afterlife');
  const old = path.join(root, '.belay');
  return !existsSync(now) && existsSync(old) ? old : now;
}

/** The data folder: AFTERLIFE_DATA_DIR (through envOf), else dotDirAt(app root) (the index lives under it too). */
export function dataDirOf(env: Env = process.env): string {
  return envOf(env, 'DATA_DIR') ?? dotDirAt(process.cwd());
}

export const settingsFile = (env: Env = process.env): string => path.join(dataDirOf(env), 'settings.json');

/** One line, trimmed, at most 200 characters: what any setting may be. Anything else is no value. */
const word = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t && t.length <= 200 && !/[\r\n\0]/.test(t) ? t : undefined;
};

/** Only the known keys, each of the right shape; the rest is dropped. */
export function cleanSettings(raw: unknown): RuntimeSettings {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: RuntimeSettings = {};
  for (const [field] of SETTING_KEYS) {
    if (field === 'mode') {
      if (r.mode === 'demo' || r.mode === 'live') out.mode = r.mode;
      continue;
    }
    const v = word(r[field]);
    if (v !== undefined) out[field] = v;
  }
  return out;
}

/** The settings file, read fresh; a missing or unreadable file is no settings. */
export function readSettings(env: Env = process.env): RuntimeSettings {
  try {
    return cleanSettings(JSON.parse(readFileSync(settingsFile(env), 'utf8')));
  } catch {
    return {};
  }
}

/** Merge `patch` into the settings file (a key set to undefined is removed) and return the new settings. */
export function writeSettings(patch: Partial<RuntimeSettings>, env: Env = process.env): RuntimeSettings {
  const merged: Record<string, unknown> = { ...readSettings(env) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete merged[k];
    else merged[k] = v;
  }
  const next = cleanSettings(merged);
  const file = settingsFile(env);
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  renameSync(tmp, file);
  return next;
}
