// apply-gate's ledger events: a guardrail_verdict states the guardrail file's verdict (pass or block), and only such a
// file yields one. The verdict then survives ledger-append and the engine's parse into the appended line.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runScript, workdir } from '../testing/harness.mjs';

const dir = workdir('apply-gate');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const HEAD = 'a'.repeat(40);
const LEDGER = `projects/${encodeURIComponent('acme/belay-ledger')}`;
const ENV = { CI_PROJECT_URL: 'https://gitlab.example/acme/ledgerline' };
const write = (name, value) => {
  const f = path.join(dir, name);
  fs.writeFileSync(f, JSON.stringify(value));
  return f;
};

/** Runs apply-gate (reporting only) with `guardrail` as the guardrail file; returns the events it emitted, by file name. */
function gate(guardrail, name) {
  const emit = path.join(dir, `events-${name}`);
  const decision = write('decision.json', { decision: 'approve', tier: 'supervised', reasons: ['proof pass'] });
  const args = ['--mr', '7', '--sha', HEAD, '--decision', decision, '--agent', 'ai-patcher-acme', '--class', 'code-fix.patch', '--emit-dir', emit, '--dry', '1'];
  if (guardrail !== undefined) args.push('--guardrail', write(`guardrail-${name}.json`, guardrail));
  const r = runScript(dir, 'decide/apply-gate.mjs', args, { env: ENV });
  expect(r.code, r.stderr).toBe(0);
  const files = fs.readdirSync(emit).sort();
  return { r, emit, files, read: (f) => JSON.parse(fs.readFileSync(path.join(emit, f), 'utf8')) };
}

describe('apply-gate: the guardrail_verdict event', () => {
  it('states pass or block from the guardrail file', () => {
    for (const verdict of ['pass', 'block']) {
      const g = gate({ schema: 'belay.guardrail/1', verdict, head_sha: HEAD, findings: [] }, verdict);
      expect(g.files).toEqual(['0-proof_verdict.json', '1-guardrail_verdict.json', '2-tier_decision.json']);
      expect(g.read('1-guardrail_verdict.json')).toMatchObject({ kind: 'guardrail_verdict', verdict, subject: { type: 'mr', iid: 7 } });
      expect('verdict' in g.read('0-proof_verdict.json') || 'verdict' in g.read('2-tier_decision.json')).toBe(false);
    }
  });

  it('a guardrail file with no pass or block emits none, and says so on stderr', () => {
    const g = gate({ schema: 'belay.guardrail/1', verdict: 'maybe', head_sha: HEAD, findings: [] }, 'other');
    expect(g.files).toEqual(['0-proof_verdict.json', '1-tier_decision.json']);
    expect(g.r.stderr).toMatch(/guardrail file states no pass or block .*no guardrail_verdict event/);
  });

  it('no guardrail file: none, as before', () => {
    expect(gate(undefined, 'none').files).toEqual(['0-proof_verdict.json', '1-tier_decision.json']);
  });

  it('the verdict survives ledger-append and the engine into the appended line', { timeout: 120_000 }, () => {
    const g = gate({ schema: 'belay.guardrail/1', verdict: 'block', head_sha: HEAD, findings: [] }, 'append');
    const routes = {
      [`${LEDGER}/repository/files/events%2F1.jsonl`]: { __http: 404, message: '404 File Not Found' },
      [`POST ${LEDGER}/repository/commits`]: { reply: { id: 'f'.repeat(40) } },
    };
    const r = runScript(dir, 'decide/ledger-append.mjs', ['--events', g.emit, '--project', 'acme/belay-ledger'], { routes, env: { BELAY_BOT_TOKEN: 'bot' } });
    expect(r.code, r.stderr).toBe(0);
    const [commit] = r.writes.filter((w) => w.path === `${LEDGER}/repository/commits`);
    const lines = commit.body.actions[0].content.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines.map((e) => [e.seq, e.kind, e.verdict])).toEqual([[1, 'proof_verdict', undefined], [2, 'guardrail_verdict', 'block'], [3, 'tier_decision', undefined]]);
    expect(lines.filter((e) => 'verdict' in e)).toHaveLength(1);
  });
});
