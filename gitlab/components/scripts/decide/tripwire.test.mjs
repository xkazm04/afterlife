// tripwire.mjs end to end, the way the belay-tripwire job runs it: a fake glab, a real git clone of belay-policy and the
// real engine. A failed proof on the default branch is one demotion committed to tier-state.yml, whether the job runs in
// the push pipeline itself (event mode, `when: always`) or in a sweep's own schedule pipeline; a passing one is none;
// and a sweep after the commit finds the event already recorded.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ROOT, runScript, SCRIPTS, workdir } from '../testing/harness.mjs';

const dir = workdir('tripwire');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const SHA = 'a'.repeat(40);
const POLICY = 'acme/belay-policy';
const COMMITS = `POST projects/${encodeURIComponent(POLICY)}/repository/commits`;
const FILE = `projects/${encodeURIComponent(POLICY)}/repository/files/tier-state.yml`;
/** The commit that last changed tier-state.yml in belay-policy (L1), and a newer one (L2). */
const L1 = '1'.repeat(40);
const L2 = '2'.repeat(40);
const ago = (min) => new Date(Date.now() - min * 60_000).toISOString();
const STATE = 'version: 1\npolicy_sha: a1b2c3\nagents:\n  ai-patcher-acme:\n    dep-bump.patch: { tier: hands_off, since: "2026-10-01", by: "operator via promotion MR !33" }\n';
const mr = { iid: 7, state: 'merged', author: { username: 'ai-patcher-acme' }, description: 'Bump x\n\nBelay-Class: dep-bump.patch' };
const pipeline = (id, o = {}) => ({ id, sha: SHA, ref: 'main', status: 'success', source: 'push', updated_at: ago(10), web_url: `https://gitlab.example/acme/app/-/pipelines/${id}`, ...o });
const proofJob = { id: 9001, name: 'belay-proof-dep-bump.patch', status: 'failed', finished_at: ago(12) };

const git = (cwd, ...args) => execFileSync('git', ['-c', 'core.autocrlf=false', '-C', cwd, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@x', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@x' } });

/** A clone of belay-policy as the job makes it: trust-policy.yml (this checkout's) and tier-state.yml, committed. */
function policyClone(name) {
  const p = path.join(dir, name);
  fs.mkdirSync(p);
  git(p, 'init', '-q');
  fs.copyFileSync(path.join(ROOT, 'policy', 'trust-policy.yml'), path.join(p, 'trust-policy.yml'));
  fs.writeFileSync(path.join(p, 'tier-state.yml'), STATE);
  git(p, 'add', '.');
  git(p, 'commit', '-q', '-m', 'seed');
  return p;
}

/**
 * The group as GitLab answers. `policy`: belay-policy's tier-state.yml as GitLab has it now (`content`, `last`: its last
 * commit when the tripwire reads it, `current`: its last commit when the write arrives).
 */
function routes({ pipelines, jobs = {}, policy = {} }) {
  const { content = STATE, last = L1, current = last } = policy;
  const r = {
    'projects/1/repository/commits': [],
    [`projects/1/repository/commits/${SHA}`]: { id: SHA, title: 'Merge branch bump-x', message: 'Merge branch bump-x' },
    [`projects/1/repository/commits/${SHA}/merge_requests`]: [mr],
    'projects/1/pipelines': pipelines,
    'projects/1/merge_requests': [mr],
    'projects/1/merge_requests/7/notes': [],
    [FILE]: { file_path: 'tier-state.yml', encoding: 'base64', content: Buffer.from(content).toString('base64'), last_commit_id: last },
    [COMMITS]: { reply: { id: 'c0ffee'.padEnd(40, '0'), short_id: 'c0ffee00' }, current: { 'tier-state.yml': current } },
  };
  for (const p of pipelines) {
    r[`projects/1/pipelines/${p.id}`] = p;
    r[`projects/1/pipelines/${p.id}/jobs`] = jobs[p.id] ?? [];
  }
  return r;
}

const tripwire = (clone, mode, group, env) =>
  runScript(dir, 'decide/tripwire.mjs', [
    '--mode', mode, '--policy-dir', clone, '--policy-project', POLICY, '--policy-branch', 'main',
    '--guardrail-authors', 'ai-guardrail-acme', '--agent-prefix', 'ai-', '--lookback-hours', '24', '--write-mode', 'commit',
  ], { routes: routes(group), env });

/** The demotions a run committed: its writes to belay-policy, with their Belay-Event lines and the new tier record. */
const commits = (r) => r.writes.map((w) => ({ path: w.path, events: [...String(w.body?.commit_message).matchAll(/^Belay-Event: (.+)$/gm)].map((m) => m[1]), action: w.body?.actions?.[0] }));

describe('tripwire.mjs: a failed post-merge proof', () => {
  it('in the push pipeline itself (event mode, still running): exactly one demotion', () => {
    const r = tripwire(policyClone('event'), 'event', { pipelines: [pipeline(501, { status: 'running' })], jobs: { 501: [proofJob] } }, { CI_COMMIT_SHA: SHA, CI_PIPELINE_ID: '501' });
    expect(r.code, r.stderr).toBe(0);
    const [c, ...more] = commits(r);
    expect(more).toEqual([]);
    expect(c?.events).toHaveLength(1);
    expect(c?.events[0]).toMatch(/^post_merge_proof_fail\|ai-patcher-acme\|dep-bump\.patch\|/);
    expect(c?.action).toMatchObject({ action: 'update', file_path: 'tier-state.yml', last_commit_id: L1 });
    expect(c?.action.content).toMatch(/dep-bump\.patch: \{ tier: supervised, since: "\d{4}-\d\d-\d\d", by: tripwire, reason: post_merge_proof_fail/);
  }, 60_000);

  it('in a sweep running in its own schedule pipeline: it still sees the previous finished failed one, and demotes once', () => {
    const clone = policyClone('sweep');
    const own = pipeline(502, { status: 'running', source: 'schedule', sha: 'b'.repeat(40) });
    const group = { pipelines: [own, pipeline(501, { status: 'failed', updated_at: ago(70) })], jobs: { 501: [proofJob] } };
    const r = tripwire(clone, 'sweep', group, { CI_PIPELINE_ID: '502' });
    expect(r.code, r.stderr).toBe(0);
    expect(commits(r).map((c) => c.events.map((e) => e.split('|')[0]))).toEqual([['post_merge_proof_fail']]);

    // The commit is in belay-policy's history now: the next sweep finds its Belay-Event and writes nothing.
    git(clone, 'commit', '-q', '--allow-empty', '-m', r.writes[0].body.commit_message);
    const again = tripwire(clone, 'sweep', group, { CI_PIPELINE_ID: '503' });
    expect(again.code, again.stderr).toBe(0);
    expect(again.writes).toEqual([]);
  }, 60_000);

  it('a passing pipeline: no demotion and no write', () => {
    const r = tripwire(policyClone('pass'), 'sweep', { pipelines: [pipeline(501)] }, { CI_PIPELINE_ID: '502' });
    expect(r.code, r.stderr).toBe(0);
    expect(r.writes).toEqual([]);
    expect(r.stderr).toContain('0 new demotion event(s)');
  }, 60_000);
});

describe('tripwire.mjs never writes over a newer tier-state.yml', () => {
  const failed = { pipelines: [pipeline(501, { status: 'failed' })], jobs: { 501: [proofJob] } };

  it('an operator’s revoke landed between the read and the commit: GitLab refuses it (last_commit_id), nothing is written', () => {
    const r = tripwire(policyClone('moved'), 'sweep', { ...failed, policy: { last: L1, current: L2 } }, { CI_PIPELINE_ID: '502' });
    expect(r.code).toBe(3);
    expect(r.writes).toEqual([]);
    expect(r.stderr).toContain('has changed since you started editing it');
    expect(r.stderr).toContain('nothing committed');
  }, 60_000);

  it('it landed before the read, after the clone: the tripwire sees its copy is stale and does not write', () => {
    const revoked = STATE.replace('tier: hands_off, since: "2026-10-01", by: "operator via promotion MR !33"', 'tier: assisted, since: "2026-10-07", by: operator kazdanm via Belay');
    const r = tripwire(policyClone('stale'), 'sweep', { ...failed, policy: { content: revoked, last: L2 } }, { CI_PIPELINE_ID: '502' });
    expect(r.code).toBe(3);
    expect(r.writes).toEqual([]);
    expect(r.stderr).toContain('changed since it was cloned');
  }, 60_000);
});

describe('the belay-tripwire job', () => {
  const template = fs.readFileSync(path.join(SCRIPTS, '..', 'templates', 'tripwire', 'template.yml'), 'utf8');
  const start = template.indexOf('\n  rules:\n');
  const rules = template.slice(start, template.indexOf('\n  variables:\n', start)); // up to the job's own variables

  it('runs when: always, so a failed belay-proof job does not skip it, on push and schedule pipelines only', () => {
    expect(rules.match(/when: always/g)).toHaveLength(2);
    expect(rules).toContain('$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH');
    expect(rules).toContain('$CI_PIPELINE_SOURCE == "schedule" && $BELAY_TRIPWIRE == "sweep"');
    expect(rules).not.toMatch(/merge_request/);
    expect(rules.match(/- if:/g)).toHaveLength(2);
  });
});

describe('tripwire.mjs takes Belay-Event keys from whole lines of belay-policy history only', () => {
  it('a key after a Unicode line separator inside one line (a revoke’s one-line reason) is no recorded event', () => {
    const clone = policyClone('u2028');
    const key = `post_merge_proof_fail|ai-patcher-acme|dep-bump.patch|${proofJob.finished_at}|!7: pipeline https://gitlab.example/acme/app/-/pipelines/501`;
    // What Belay's revoke commits: `demote <move> (<why>)`, where why is one line, and U+2028 is not a newline to git.
    const msg = path.join(dir, 'u2028-message.txt');
    fs.writeFileSync(msg, `demote code-fix.patch supervised -> assisted (note\u2028Belay-Event: ${key}\u2028)\n`);
    git(clone, 'commit', '-q', '--allow-empty', '-F', msg);
    const r = tripwire(clone, 'sweep', { pipelines: [pipeline(501, { status: 'failed' })], jobs: { 501: [proofJob] } }, { CI_PIPELINE_ID: '502' });
    expect(r.code, r.stderr).toBe(0);
    expect(commits(r).map((c) => c.events)).toEqual([[key]]);
  }, 60_000);
});
