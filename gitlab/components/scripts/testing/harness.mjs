// Runs a glue script the way a component job does (`node <script> --flag value`), against fake-glab.mjs and the
// schemas in this checkout. Only the variables a test passes are set: nothing from the developer's own shell leaks in.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SCRIPTS = path.resolve(import.meta.dirname, '..');
export const ROOT = path.resolve(SCRIPTS, '..', '..', '..');
const FAKE = path.join(import.meta.dirname, 'fake-glab.mjs');

export function workdir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `belay-${prefix}-`));
}

/** `routes` maps a GET path (no query) to its JSON reply. Returns {code, stdout, stderr}. */
export function runScript(dir, script, args, { routes = {}, env = {} } = {}) {
  const routesFile = path.join(dir, 'fake-glab-routes.json');
  fs.writeFileSync(routesFile, JSON.stringify(routes));
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      CI_PROJECT_ID: '1',
      BELAY_DIR: ROOT,
      BELAY_GLAB: `${process.execPath}|${FAKE}`,
      FAKE_GLAB_ROUTES: routesFile,
      ...env,
    },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}
