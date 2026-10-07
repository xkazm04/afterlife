// belay-apply's tripwire sweep: the components' tripwire.mjs, run from belay-apply for each target of the paired group,
// commits the demotion to belay-policy with BELAY_POLICY_TOKEN, a token no target pipeline holds (F4). A fake glab, a real
// clone of belay-policy and the real engine.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { ROOT, runScript, workdir } from '../components/scripts/testing/harness.mjs';

const dir = workdir('apply-tripwire');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const SHA = 'a'.repeat(40);
const L1 = '1'.repeat(40);
const POLICY_API = `projects/${encodeURIComponent('acme/belay-policy')}`;
const STATE = 'version: 1\npolicy_sha: a1b2c3\nagents:\n  ai-patcher-acme:\n    dep-bump.patch: { tier: hands_off, since: "2026-10-01", by: "operator via promotion MR !33" }\n';
const ago = (min) => new Date(Date.now() - min * 60_000).toISOString();
const git = (cwd, ...args) => execFileSync('git', ['-c', 'core.autocrlf=false', '-C', cwd, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@x', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@x' } });

const POLICY = (() => {
  const p = path.join(dir, 'belay-policy');
  fs.mkdirSync(p);
  git(p, 'init', '-q', '-b', 'main');
  fs.copyFileSync(path.join(ROOT, 'policy', 'trust-policy.yml'), path.join(p, 'trust-policy.yml'));
  fs.writeFileSync(path.join(p, 'tier-state.yml'), STATE);
  git(p, 'add', '.');
  git(p, 'commit', '-q', '-m', 'seed');
  return pathToFileURL(p).href;
})();

const CONFIG = path.join(dir, 'apply.json');
fs.writeFileSync(CONFIG, JSON.stringify({
  group: 'acme', policy: { project: 'acme/belay-policy', branch: 'main' }, ledger: { project: 'acme/belay-ledger' },
  bot: 'belay-bot', guardrail_authors: 'ai-guardrail-acme', targets: { 'acme/ledgerline': {}, 'other/shared': {} },
}));

const mr = { iid: 7, state: 'merged', author: { username: 'ai-patcher-acme' }, description: 'Bump x\n\nBelay-Class: dep-bump.patch' };
const pipeline = { id: 501, sha: SHA, ref: 'main', status: 'failed', source: 'push', updated_at: ago(10), web_url: 'https://gitlab.example/acme/ledgerline/-/pipelines/501' };
const routes = {
  'groups/acme/projects': [
    { id: 1, path_with_namespace: 'acme/ledgerline', default_branch: 'main' },
    { id: 2, path_with_namespace: 'other/shared', default_branch: 'main' },
  ],
  'projects/1': { id: 1, default_branch: 'main' },
  'projects/1/repository/commits': [],
  [`projects/1/repository/commits/${SHA}/merge_requests`]: [mr],
  'projects/1/pipelines': [pipeline],
  'projects/1/pipelines/501': pipeline,
  'projects/1/pipelines/501/jobs': [{ id: 9001, name: 'belay-proof-exploit-test', status: 'failed', finished_at: ago(12) }],
  'projects/1/merge_requests': [mr],
  'projects/1/merge_requests/7/notes': [],
  [`${POLICY_API}/repository/files/tier-state.yml`]: { file_path: 'tier-state.yml', encoding: 'base64', content: Buffer.from(STATE).toString('base64'), last_commit_id: L1 },
  [`POST ${POLICY_API}/repository/commits`]: { reply: { id: 'c'.repeat(40) }, current: { 'tier-state.yml': L1 } },
};

const sweep = (env) => runScript(dir, '../../apply/tripwire-sweep.mjs', ['--config', CONFIG, '--policy-remote', POLICY, '--work', path.join(dir, 'work')], { routes, env });

describe('belay-apply tripwire sweep', { timeout: 120_000 }, () => {
  it('(vii) a failed post-merge proof in a target commits the demotion to belay-policy from belay-apply', () => {
    const r = sweep({ BELAY_BOT_TOKEN: 'bot', BELAY_POLICY_TOKEN: 'policy' });
    expect(r.code, r.stderr).toBe(0);
    expect(r.writes).toHaveLength(1);
    const [w] = r.writes;
    expect(w.path).toBe(`${POLICY_API}/repository/commits`);
    expect(w.body.branch).toBe('main');
    expect(w.body.actions[0]).toMatchObject({ action: 'update', file_path: 'tier-state.yml', last_commit_id: L1 });
    expect(w.body.actions[0].content).toMatch(/dep-bump\.patch: \{ tier: supervised/);
    expect(w.body.commit_message).toMatch(/^Belay-Event: post_merge_proof_fail\|ai-patcher-acme\|dep-bump\.patch\|/m);
    expect(r.stderr).toMatch(/skip other\/shared: it is shared into acme from elsewhere/);
    expect(r.reads.filter((p) => p.startsWith('projects/2'))).toEqual([]);
  });

  it('without BELAY_POLICY_TOKEN it reports and sweeps nothing', () => {
    const r = sweep({ BELAY_BOT_TOKEN: 'bot' });
    expect(r.code).toBe(0);
    expect(r.writes).toEqual([]);
    expect(r.reads).toEqual([]);
  });
});
