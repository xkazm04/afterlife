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

/**
 * `routes` maps a GET path (no query) to its JSON reply, and "<METHOD> <path>" to a write's `{reply}`. Returns
 * {code, stdout, stderr, writes}: `writes` are the writes the script made, in order, each `{method, path, body}`.
 */
export function runScript(dir, script, args, { routes = {}, env = {} } = {}) {
  const routesFile = path.join(dir, 'fake-glab-routes.json');
  const writesFile = path.join(dir, 'fake-glab-writes.jsonl');
  fs.writeFileSync(routesFile, JSON.stringify(routes));
  fs.writeFileSync(writesFile, '');
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
      FAKE_GLAB_WRITES: writesFile,
      ...env,
    },
  });
  const writes = fs.readFileSync(writesFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, writes };
}

/**
 * The same route map in process, for a module that takes its `api` and `apiAll` as arguments (detect.mjs): a GET path not
 * in the map throws, as glab fails; page 2 and later of a list are empty. `calls` lists every path read, in order.
 */
export function fakeApi(routes) {
  const calls = [];
  const api = (p, { method = 'GET' } = {}) => {
    calls.push(p);
    const [base = '', query = ''] = p.split('?');
    if (method !== 'GET' || !(base in routes)) throw new Error(`fake api: ${method} ${p} is not faked`);
    return Number(new URLSearchParams(query).get('page') ?? '1') > 1 ? [] : structuredClone(routes[base]);
  };
  const apiAll = (p, maxPages = 5) => {
    const rows = [];
    for (let page = 1; page <= maxPages; page++) {
      const got = api(`${p}${p.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(got) || got.length === 0) break;
      rows.push(...got);
      if (got.length < 100) break;
    }
    return rows;
  };
  const gql = () => {
    throw new Error('fake api: graphql is not faked');
  };
  return { api, apiAll, gql, calls };
}
