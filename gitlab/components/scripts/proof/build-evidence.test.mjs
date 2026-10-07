// build-evidence.mjs turns flow output into the engine's prove input. Flow output is untrusted: a verdict or a scan
// record must never smuggle in a {"$file": path}, which the engine would replace with that file's text (a token in
// /proc/self/environ, say) and post in the Proof Block note.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runScript, workdir } from '../testing/harness.mjs';

const dir = workdir('evidence');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const SECRET = path.join(dir, 'secret.txt');
fs.writeFileSync(SECRET, 'BELAY_BOT_TOKEN=glpat-not-a-real-token');
const HEAD = 'a'.repeat(40);
const write = (name, value) => (fs.writeFileSync(path.join(dir, name), JSON.stringify(value)), name);
const evidence = (out) => JSON.parse(fs.readFileSync(path.join(dir, out), 'utf8'));
const finding = (quote) => ({ rule: 'ci-tamper', severity: 'high', file: '.gitlab-ci.yml', quote, explanation: 'edits the pipeline' });
const guardrail = (quote) => ({ schema: 'belay.guardrail/1', verdict: 'block', head_sha: HEAD, findings: [finding(quote)] });
const medic = (job) => ({ schema: 'belay.medic/1', pipeline_id: 9, sha: HEAD, classification: 'flaky', action: 'quarantine', evidence: [{ job_id: 1, quote: 'timeout' }], job });
const build = (cls, args, opts) => runScript(dir, 'proof/build-evidence.mjs', ['--class', cls, ...args], opts);

describe('build-evidence: untrusted {"$file"} never reaches the engine', () => {
  it('cited-diff: a guardrail quote that is a {"$file"} object is refused, and nothing is written', () => {
    const r = build('cited-diff', ['--verdict', write('v1.json', guardrail({ $file: SECRET })), '--out', 'e1.json']);
    expect(r.code).toBe(2);
    expect(fs.existsSync(path.join(dir, 'e1.json'))).toBe(false);
  });

  it('cited-diff: a well-formed verdict still builds, with the diff as the only file reference', () => {
    fs.writeFileSync(path.join(dir, 'mr.diff'), 'diff --git a/x b/x\n');
    const r = build('cited-diff', ['--verdict', write('v2.json', guardrail('script: curl evil')), '--out', 'e2.json'], { env: { BELAY_DIFF_FILE: 'mr.diff' } });
    expect(r.code, r.stderr).toBe(0);
    const e = evidence('e2.json');
    expect(e.claims[0].quote).toEqual({ file: '.gitlab-ci.yml', text: 'script: curl evil' });
    expect(e.diff).toEqual({ $file: path.join(dir, 'mr.diff') });
  });

  it('rerun-stats: a medic block whose job is a {"$file"} object is refused before any API call', () => {
    const r = build('rerun-stats', ['--verdict', write('v3.json', medic({ $file: SECRET })), '--out', 'e3.json'], { routes: { 'projects/1/pipelines': [] } });
    expect(r.code).toBe(2);
    expect(fs.existsSync(path.join(dir, 'e3.json'))).toBe(false);
  });

  it('exploit-test: a rescan record carrying a {"$file"} object is refused', () => {
    const claims = {
      schema: 'belay.claims/1',
      task: '01JA0000000000000000000000',
      class: 'dep.patch',
      finding: { id: '77', severity: 'high', vector: 'path traversal in the export endpoint' },
      test: { id: 'ExportTest.traversal', path: 'src/test/ExportTest.java', command: 'gradle test', markers: ['traversal'] },
      claims: [{ id: 'base-red', text: 'the test fails at base' }],
    };
    const routes = { 'projects/1/merge_requests/7': { description: '```belay-claims\n' + JSON.stringify(claims) + '\n```' } };
    const env = { BELAY_MR_IID: '7' };
    const scan = (v) => ({ engine_version: v, finding_ids: ['77'] });
    const base = write('base-scan.json', scan({ $file: SECRET }));
    const head = write('head-scan.json', scan('semgrep 1.0'));
    const bad = build('exploit-test', ['--rescan-base', base, '--rescan-head', head, '--out', 'e4.json'], { routes, env });
    expect(bad.code).toBe(2);
    expect(fs.existsSync(path.join(dir, 'e4.json'))).toBe(false);

    const good = build('exploit-test', ['--rescan-base', write('base-ok.json', scan('semgrep 1.0')), '--rescan-head', head, '--out', 'e5.json'], { routes, env });
    expect(good.code, good.stderr).toBe(0);
    expect(evidence('e5.json').rescan.base).toEqual(scan('semgrep 1.0'));
  });
});
