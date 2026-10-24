// Fixtures for glab-retry.test.mjs and glab-retry.callers.test.mjs: a fake glab (fake-glab.mjs, `__transient` routes),
// the calls and writes it saw, and the backoff sleeps glab() asked for (recorded, never waited). Each test file that
// imports this gets its own module, so its own temp dir and its own lib.mjs.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// lib.mjs picks its glab and host when it is first loaded, and harness.mjs loads it: both are imported (load()) only after
// the fake is named, so no call here can reach a real glab or a real GitLab.
export const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-glab-retry-'));
const ROUTES = path.join(dir, 'routes.json');
const WRITES = path.join(dir, 'writes.jsonl');
process.env.BELAY_GLAB = `${process.execPath}|${path.resolve(import.meta.dirname, '..', '..', 'testing', 'fake-glab.mjs')}`;
process.env.CI_SERVER_FQDN = 'gitlab.invalid';
process.env.FAKE_GLAB_ROUTES = ROUTES;
process.env.FAKE_GLAB_WRITES = WRITES;
export let slept = [];

/** lib.mjs and harness.mjs, imported now that the fake is named; glab()'s backoff sleep is recorded in `slept`. */
export async function load() {
  const lib = await import('../lib.mjs');
  const harness = await import('../../testing/harness.mjs');
  lib.setSleep((ms) => slept.push(ms));
  return { lib, harness };
}
export const cleanup = () => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

export const serve = (routes) => {
  fs.writeFileSync(ROUTES, JSON.stringify(routes));
  fs.rmSync(`${ROUTES}.calls.json`, { force: true });
  fs.writeFileSync(WRITES, '');
  slept = [];
};
export const calls = (key) => (fs.existsSync(`${ROUTES}.calls.json`) ? JSON.parse(fs.readFileSync(`${ROUTES}.calls.json`, 'utf8'))[key] ?? 0 : 0);
export const writes = () => fs.readFileSync(WRITES, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
export const thrown = (fn) => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('did not throw');
};

export const MR = 'projects/1/merge_requests/7';
export const flaky = (faults, then) => ({ __transient: faults, then });
