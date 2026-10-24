// Fixtures for derive-gate.test.mjs and derive-gate.ledger.test.mjs: a fake GitLab (notes, compare, belay-policy, ledger),
// a Proof Block from the real engine, the hand-run itself, and apply-gate on the same inputs. Each test file that imports
// this gets its own module and so its own workdir, which it removes in its afterAll.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { ROOT, runScript, workdir } from '../testing/harness.mjs';

export const dir = workdir('hand-gate');

const BASE = 'b'.repeat(40);
export const HEAD = 'a'.repeat(40);
export const URL_ = 'https://gitlab.example/acme/ledgerline';
export const OP = 'op-hand';
const FIX = path.join(ROOT, 'engine/__fixtures__/exploit');
const POLICY_TEXT = fs.readFileSync(path.join(ROOT, 'policy', 'trust-policy.yml'), 'utf8');
const POLICY_API = `projects/${encodeURIComponent('acme/belay-policy')}`;
const STATE = 'version: 1\npolicy_sha: a1b2c3\nagents:\n  ai-patcher-acme:\n    code-fix.patch: { tier: supervised, since: "2026-10-01", by: "start tier + record" }\n';
export const DIFF = fs.readFileSync(path.join(FIX, 'fix.diff'), 'utf8');
const engine = (...args) => spawnSync('npx', ['tsx', 'engine/cli.ts', ...args], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });

/** A Proof Block from the real engine, made for HEAD, as the operator posted it in step 2. */
export const PROOF = { ...JSON.parse(engine('prove', '--class', 'exploit-test', '--input', path.join(FIX, 'input.pass.json'), '--policy', path.join(ROOT, 'policy', 'trust-policy.yml'), '--files-root', FIX).stdout) };
PROOF.task = { ...PROOF.task, head_sha: HEAD };

export const verdict = (v, head = HEAD) => ({ schema: 'belay.guardrail/1', verdict: v, head_sha: head, findings: [] });
export const note = (id, username, tag, value) => ({ id, system: false, author: { username }, created_at: '2026-10-09T10:00:00Z', body: `note\n\n\`\`\`${tag}\n${JSON.stringify(value)}\n\`\`\`` });
export const proofNote = note(40, OP, 'belay-proof', PROOF);
const compareOf = (diff) => ({
  diffs: diff.split(/^(?=diff --git )/m).filter(Boolean).map((chunk) => {
    const from = /^--- (?:a\/)?(.+)$/m.exec(chunk)[1];
    const to = /^\+\+\+ (?:b\/)?(.+)$/m.exec(chunk)[1];
    return { old_path: from === '/dev/null' ? to : from, new_path: to, new_file: from === '/dev/null', deleted_file: false, diff: chunk.slice(chunk.indexOf('@@')) };
  }),
});
const description = 'Fix the export traversal\n\nBelay-Task: 01J9ZP6M2Q8E4V7K3N5R1T0XAB\nBelay-Class: code-fix.patch';

export const LEDGER = 'acme/belay-ledger';
export const LEDGER_API = `projects/${encodeURIComponent(LEDGER)}/repository/commits`;
/** A ledger commit as sweep.mjs's appendLedger leaves it: the key in a `Belay-Head:` line of the message. */
export const commit = (key) => ({ id: 'c1', message: `ledger: events

Belay-Head: ${key}` });

export function routes({ notes = [note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict('pass')), proofNote], diff = DIFF, ledger = [] } = {}) {
  return {
    [LEDGER_API]: ledger,
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
export function derive(name, opts) {
  const out = path.join(dir, `out-${name}`);
  const r = runScript(dir, 'hand/derive-gate.mjs', ['--mr', '7', '--proof-authors', OP, '--guardrail-authors', 'ai-guardrail-acme', '--policy-project', 'acme/belay-policy', '--ledger-project', LEDGER, '--out', out],
    { routes: routes(opts), env: { BELAY_GUARDRAIL_AUTHORS: 'ai-patcher-acme', BELAY_PROOF_AUTHORS: 'ai-patcher-acme' } });
  const events = path.join(out, 'events');
  const files = fs.existsSync(events) ? fs.readdirSync(events).sort() : [];
  return { r, out, files, read: (f) => JSON.parse(fs.readFileSync(path.join(events, f), 'utf8')) };
}

/** What apply-gate emits for the same inputs, each written here by the test, and the decision of the engine on them. */
export function applyGateOn(guardrail) {
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
export const withoutAt = ({ at, ...rest }) => (expect(typeof at).toBe('string'), rest);

/** (iii) after every run: no job or artifact path was read, and nothing was written to GitLab. */
export function noArtifactNoWrite(r) {
  expect(r.reads.filter((p) => /(^|\/)jobs\/|artifacts/.test(p))).toEqual([]);
  expect(r.writes).toEqual([]);
}

export const KEY = `1!7@${HEAD}`;
