// The M1 hand-run's step 4 (F90): derive-gate.mjs derives the gate's ledger events on the operator's machine from what
// GitLab holds (the notes, belay-policy's default branch, the compare API), against a fake glab and the real engine. It
// emits what apply-gate emits for the same inputs, trusts only the guardrail account named on its command line, never
// reads a job artifact and writes nothing to GitLab.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ROOT, runScript, workdir } from '../testing/harness.mjs';

const dir = workdir('hand-gate');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const BASE = 'b'.repeat(40);
const HEAD = 'a'.repeat(40);
const URL_ = 'https://gitlab.example/acme/ledgerline';
const OP = 'op-hand';
const FIX = path.join(ROOT, 'engine/__fixtures__/exploit');
const POLICY_TEXT = fs.readFileSync(path.join(ROOT, 'policy', 'trust-policy.yml'), 'utf8');
const POLICY_API = `projects/${encodeURIComponent('acme/belay-policy')}`;
const STATE = 'version: 1\npolicy_sha: a1b2c3\nagents:\n  ai-patcher-acme:\n    code-fix.patch: { tier: supervised, since: "2026-10-01", by: "start tier + record" }\n';
const DIFF = fs.readFileSync(path.join(FIX, 'fix.diff'), 'utf8');
const engine = (...args) => spawnSync('npx', ['tsx', 'engine/cli.ts', ...args], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });

/** A Proof Block from the real engine, made for HEAD, as the operator posted it in step 2. */
const PROOF = { ...JSON.parse(engine('prove', '--class', 'exploit-test', '--input', path.join(FIX, 'input.pass.json'), '--policy', path.join(ROOT, 'policy', 'trust-policy.yml'), '--files-root', FIX).stdout) };
PROOF.task = { ...PROOF.task, head_sha: HEAD };

const verdict = (v, head = HEAD) => ({ schema: 'belay.guardrail/1', verdict: v, head_sha: head, findings: [] });
const note = (id, username, tag, value) => ({ id, system: false, author: { username }, created_at: '2026-10-09T10:00:00Z', body: `note\n\n\`\`\`${tag}\n${JSON.stringify(value)}\n\`\`\`` });
const proofNote = note(40, OP, 'belay-proof', PROOF);
const compareOf = (diff) => ({
  diffs: diff.split(/^(?=diff --git )/m).filter(Boolean).map((chunk) => {
    const from = /^--- (?:a\/)?(.+)$/m.exec(chunk)[1];
    const to = /^\+\+\+ (?:b\/)?(.+)$/m.exec(chunk)[1];
    return { old_path: from === '/dev/null' ? to : from, new_path: to, new_file: from === '/dev/null', deleted_file: false, diff: chunk.slice(chunk.indexOf('@@')) };
  }),
});
const description = 'Fix the export traversal\n\nBelay-Task: 01J9ZP6M2Q8E4V7K3N5R1T0XAB\nBelay-Class: code-fix.patch';

function routes({ notes = [note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict('pass')), proofNote], diff = DIFF } = {}) {
  return {
    'projects/1': { id: 1, path_with_namespace: 'acme/ledgerline', web_url: URL_, default_branch: 'main', ci_config_path: null },
    'projects/1/merge_requests/7': { iid: 7, author: { username: 'ai-patcher-acme' }, description, target_branch: 'main', sha: HEAD, diff_refs: { base_sha: BASE, head_sha: HEAD } },
    'projects/1/merge_requests/7/notes': notes,
    'projects/1/repository/compare': compareOf(diff),
    'projects/1/repository/files/.gitlab-ci.yml/raw': { __raw: 'stages: [build, test]\n' },
    [POLICY_API]: { default_branch: 'main' },
    [`${POLICY_API}/repository/files/trust-policy.yml/raw`]: { __raw: POLICY_TEXT },
    [`${POLICY_API}/repository/files/tier-state.yml/raw`]: { __raw: STATE },
  };
}

/** One hand-run. The variables the target's job would read name the agent: the script must not take them. */
function derive(name, opts) {
  const out = path.join(dir, `out-${name}`);
  const r = runScript(dir, 'hand/derive-gate.mjs', ['--mr', '7', '--proof-authors', OP, '--guardrail-authors', 'ai-guardrail-acme', '--policy-project', 'acme/belay-policy', '--out', out],
    { routes: routes(opts), env: { BELAY_GUARDRAIL_AUTHORS: 'ai-patcher-acme', BELAY_PROOF_AUTHORS: 'ai-patcher-acme' } });
  const events = path.join(out, 'events');
  const files = fs.existsSync(events) ? fs.readdirSync(events).sort() : [];
  return { r, out, files, read: (f) => JSON.parse(fs.readFileSync(path.join(events, f), 'utf8')) };
}

/** What apply-gate emits for the same inputs, each written here by the test, and the decision of the engine on them. */
function applyGateOn(guardrail) {
  const d = path.join(dir, `expect-${guardrail.verdict}`);
  fs.mkdirSync(d, { recursive: true });
  const f = (n, text) => (fs.writeFileSync(path.join(d, n), text), path.join(d, n));
  const g = engine('gate', '--policy', f('trust-policy.yml', POLICY_TEXT), '--state', f('tier-state.yml', STATE), '--class', 'code-fix.patch', '--agent', 'ai-patcher-acme',
    '--proof', f('proof.json', JSON.stringify(PROOF)), '--guardrail', f('guardrail-gate.json', JSON.stringify({ verdict: guardrail.verdict })), '--diff', f('diff.patch', DIFF));
  const r = runScript(dir, 'decide/apply-gate.mjs', ['--mr', '7', '--sha', HEAD, '--decision', f('decision.json', g.stdout), '--guardrail', f('guardrail.json', JSON.stringify(guardrail)),
    '--agent', 'ai-patcher-acme', '--class', 'code-fix.patch', '--emit-dir', path.join(d, 'events'), '--dry', '1'], { env: { CI_PROJECT_URL: URL_ } });
  expect(r.code, r.stderr).toBeLessThan(2);
  return fs.readdirSync(path.join(d, 'events')).sort().map((n) => JSON.parse(fs.readFileSync(path.join(d, 'events', n), 'utf8')));
}
const withoutAt = ({ at, ...rest }) => (expect(typeof at).toBe('string'), rest);

/** (iii) after every run: no job or artifact path was read, and nothing was written to GitLab. */
function noArtifactNoWrite(r) {
  expect(r.reads.filter((p) => /(^|\/)jobs\/|artifacts/.test(p))).toEqual([]);
  expect(r.writes).toEqual([]);
}

describe('derive-gate (M1 hand-run step 4, F90)', { timeout: 120_000 }, () => {
  it('(i) emits the proof_verdict, guardrail_verdict and tier_decision bodies apply-gate emits for the same inputs', () => {
    for (const v of ['pass', 'block']) {
      const notes = [note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict(v)), proofNote];
      const got = derive(`same-${v}`, { notes });
      expect(got.r.code, got.r.stderr).toBe(0);
      expect(got.files).toEqual(['0-proof_verdict.json', '1-guardrail_verdict.json', '2-tier_decision.json']);
      const want = applyGateOn(verdict(v));
      expect(got.files.map((f) => withoutAt(got.read(f)))).toEqual(want.map(withoutAt));
      expect(got.read('1-guardrail_verdict.json')).toMatchObject({ verdict: v, tier_at_time: 'supervised', agent: 'ai-patcher-acme', payload_ref: `${URL_}/-/merge_requests/7`, subject: { project_id: 1, iid: 7 } });
      noArtifactNoWrite(got.r);
    }
  });

  it('(ii) a guardrail note by an author not named in --authors yields no pass, whatever the variables say', () => {
    const agentPass = note(60, 'ai-patcher-acme', 'belay-guardrail', verdict('pass'));
    const alone = derive('agent-only', { notes: [agentPass, proofNote] });
    expect(alone.r.code, alone.r.stderr).toBe(3);
    expect(alone.r.stderr).toMatch(/no belay-guardrail verdict by ai-guardrail-acme .*the ledger line waits/);
    expect(alone.files).toEqual([]);
    noArtifactNoWrite(alone.r);

    // The agent's newer pass does not shadow the guardrail's own block.
    const shadow = derive('agent-shadow', { notes: [agentPass, note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict('block')), proofNote] });
    expect(shadow.r.code, shadow.r.stderr).toBe(0);
    expect(shadow.read('1-guardrail_verdict.json').verdict).toBe('block');
    noArtifactNoWrite(shadow.r);
  });

  it('a proof the operator did not post, or an MR that changes its CI configuration, yields no events', () => {
    const notMine = derive('agent-proof', { notes: [note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict('pass')), note(40, 'ai-patcher-acme', 'belay-proof', PROOF)] });
    expect(notMine.r.code, notMine.r.stderr).toBe(3);
    expect(notMine.r.stderr).toMatch(/no belay-proof note by op-hand/);
    expect(notMine.files).toEqual([]);

    const ci = derive('ci', { diff: `${DIFF}diff --git a/.gitlab-ci.yml b/.gitlab-ci.yml\n--- a/.gitlab-ci.yml\n+++ b/.gitlab-ci.yml\n@@ -1 +1 @@\n-stages: [build]\n+stages: [build, test]\n` });
    expect(ci.r.code, ci.r.stderr).toBe(3);
    expect(ci.r.stderr).toMatch(/it changes the CI file \.gitlab-ci\.yml/);
    expect(ci.files).toEqual([]);
    for (const x of [notMine, ci]) noArtifactNoWrite(x.r);
  });

  it('refuses an out directory that already holds files, before any read', () => {
    const out = path.join(dir, 'out-used');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'stale.json'), '{}');
    const r = runScript(dir, 'hand/derive-gate.mjs', ['--mr', '7', '--proof-authors', OP, '--guardrail-authors', 'ai-guardrail-acme', '--policy-project', 'acme/belay-policy', '--out', out], { routes: routes() });
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/is not empty/);
    expect(r.reads).toEqual([]);
  });
});
