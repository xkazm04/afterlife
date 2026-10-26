// The runner's env and data folder under the product's name, the same rules as src/server/env (the runner never imports
// the server): AFTERLIFE_<KEY>, else the pre-rename BELAY_<KEY>, and `.afterlife/` unless only an old `.belay/` exists.
import fs from 'node:fs';
import path from 'node:path';

/** AFTERLIFE_<key>, else BELAY_<key>, else undefined; an empty value counts as unset. */
export function envOf(env: Record<string, string | undefined>, key: string): string | undefined {
  return env[`AFTERLIFE_${key}`] || env[`BELAY_${key}`] || undefined;
}

/** `<root>/.afterlife`, unless only the pre-rename `<root>/.belay` exists: a fleet file and runs are never stranded. */
export function dotDirAt(root: string): string {
  const now = path.join(root, '.afterlife');
  const old = path.join(root, '.belay');
  return !fs.existsSync(now) && fs.existsSync(old) ? old : now;
}
