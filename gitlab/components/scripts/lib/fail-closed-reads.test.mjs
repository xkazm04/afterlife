// A failed read is unknown, never absent: only GitLab's 404 means the file is not there. Covers readFile, ledger-append
// (reads the ledger through fileHead and sends its last_commit_id) and collect-facts, against fake-glab.mjs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { runScript, SCRIPTS, workdir } from '../testing/harness.mjs';

const dir = workdir('fail-closed');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const LEDGER = 'acme/belay-ledger';
const FILE = 'events/1.jsonl';
const FILE_URL = `projects/${encodeURIComponent(LEDGER)}/repository/files/${encodeURIComponent(FILE)}`;
const COMMITS = `POST projects/${encodeURIComponent(LEDGER)}/repository/commits`;
const http = (status, message) => ({ __http: status, message });
const L1 = '1'.repeat(40);
const L2 = '2'.repeat(40);

const event = path.join(dir, 'event.json');
fs.writeFileSync(event, JSON.stringify({
  at: '2026-10-07T10:00:00Z', agent: 'ai-patcher-acme', action_class: 'dep-bump.patch', kind: 'proof_verdict', tier_at_time: 'hands_off',
  subject: { project_id: 1, type: 'mr', iid: 7 }, payload_ref: 'acme/app/-/merge_requests/7', observed_by: 'ci_job',
}));

const appendArgs = ['--event', event, '--project', LEDGER, '--branch', 'main', '--path', FILE];
const append = (routes) => runScript(dir, 'decide/ledger-append.mjs', appendArgs, { routes });
const head = (content, id = L1) => ({ content: Buffer.from(content).toString('base64'), encoding: 'base64', last_commit_id: id });

describe('readFile', () => {
  const read = (route) => {
    const routesFile = path.join(dir, 'read-routes.json');
    fs.writeFileSync(routesFile, JSON.stringify({ [`${FILE_URL}/raw`]: route }));
    const code = `import { readFile } from ${JSON.stringify(pathToFileURL(path.join(SCRIPTS, 'lib/repo-write.mjs')).href)};
      try { console.log(JSON.stringify({ value: readFile(${JSON.stringify(LEDGER)}, ${JSON.stringify(FILE)}, 'main') })); } catch (e) { console.log(JSON.stringify({ threw: e.message })); }`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, BELAY_GLAB: `${process.execPath}|${path.join(SCRIPTS, 'testing/fake-glab.mjs')}`, FAKE_GLAB_ROUTES: routesFile },
    });
    return JSON.parse(r.stdout.trim());
  };
  it('returns null on a 404', () => expect(read(http(404, '404 File Not Found'))).toEqual({ value: null }));
  it('throws on a 403, with GitLab\'s message', () => expect(read(http(403, '403 Forbidden')).threw).toMatch(/403 Forbidden/));
});

describe('ledger-append', () => {
  it('on an unreadable ledger exits non-zero and writes nothing', () => {
    const r = append({ [FILE_URL]: http(403, '403 Forbidden'), [COMMITS]: { reply: {} } });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/403 Forbidden/);
    expect(r.writes).toEqual([]);
  });

  it('on a 404 starts the chain at seq 1 with a create action', () => {
    const r = append({ [FILE_URL]: http(404, '404 File Not Found'), [COMMITS]: { reply: {} } });
    expect(r.code).toBe(0);
    const [w] = r.writes;
    expect(w.body.actions[0]).toMatchObject({ action: 'create', file_path: FILE });
    expect(w.body.actions[0]).not.toHaveProperty('last_commit_id');
    expect(JSON.parse(w.body.actions[0].content.trim()).seq).toBe(1);
  });

  it('on an existing ledger sends an update with the last_commit_id it read', () => {
    const first = append({ [FILE_URL]: http(404, '404 File Not Found'), [COMMITS]: { reply: {} } });
    const chain = first.writes[0].body.actions[0].content;
    const r = append({ [FILE_URL]: head(chain), [COMMITS]: { reply: {}, current: { [FILE]: L1 } } });
    expect(r.code).toBe(0);
    expect(r.writes[0].body.actions[0]).toMatchObject({ action: 'update', file_path: FILE, last_commit_id: L1 });
    expect(JSON.parse(r.writes[0].body.actions[0].content.trim().split('\n')[1]).seq).toBe(2);
  });

  it('refuses a write over a newer ledger file', () => {
    const first = append({ [FILE_URL]: http(404, '404 File Not Found'), [COMMITS]: { reply: {} } });
    const chain = first.writes[0].body.actions[0].content;
    const r = append({ [FILE_URL]: head(chain, L1), [COMMITS]: { reply: {}, current: { [FILE]: L2 } } });
    expect(r.code).not.toBe(0);
    expect(r.writes).toEqual([]);
  });
});

describe('collect-facts', () => {
  const CODEOWNERS = ['CODEOWNERS', '.gitlab/CODEOWNERS', 'docs/CODEOWNERS'].map((f) => `projects/1/repository/files/${encodeURIComponent(f)}`);
  const run = (route) => {
    const out = path.join(dir, 'facts.json');
    const routes = { 'projects/1': { path_with_namespace: 'acme/app', default_branch: 'main', visibility: 'private' } };
    for (const c of CODEOWNERS) routes[c] = route;
    runScript(dir, 'ops/collect-facts.mjs', ['--out', out], { routes, env: { CI_DEFAULT_BRANCH: 'main' } });
    return JSON.parse(fs.readFileSync(out, 'utf8')).facts;
  };
  it('records codeowners as {error} on a 403, not as []', () => {
    const f = run(http(403, '403 Forbidden'));
    expect(f.codeowners).toEqual({ error: expect.stringContaining('403 Forbidden') });
  });
  it('records codeowners as [] when every candidate is a 404', () => {
    expect(run(http(404, '404 File Not Found')).codeowners).toEqual([]);
  });
});
