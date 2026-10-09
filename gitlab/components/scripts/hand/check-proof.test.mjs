// The M1 hand-run's step 1 guard (F90): check-proof.mjs writes the target's proof for the operator to post only when the
// job is a belay-proof job of a merge request pipeline of the current head with no pipeline variables, the MR changes no CI
// configuration by belay-apply's rule (ci-touch.mjs, F68), and the proof passes for that head. Anything else writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runScript, workdir } from '../testing/harness.mjs';

const dir = workdir('hand-proof');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const BASE = 'b'.repeat(40);
const HEAD = 'a'.repeat(40);
const OLD = 'c'.repeat(40);
const ART = 'projects/1/jobs/9001/artifacts/.belay/proof.json';
const proof = (over = {}) => ({ schema: 'belay.proof/1', class: 'exploit-test', verdict: 'pass', task: { head_sha: HEAD }, checks: [], ...over });
const change = (p) => ({ old_path: p, new_path: p, new_file: false, deleted_file: false, diff: '@@ -1 +1 @@\n-a\n+b\n' });

function routes({ changed = ['statements/src/Export.kt'], ci = 'stages: [test]\ninclude:\n  - local: /ci/replay.yml\n', job = {}, pipeline = {}, variables = [], art = proof() } = {}) {
  return {
    'projects/1': { id: 1, path_with_namespace: 'acme/ledgerline', web_url: 'https://gitlab.example/acme/ledgerline', default_branch: 'main', ci_config_path: null },
    'projects/1/merge_requests/7': { iid: 7, target_branch: 'main', sha: HEAD, diff_refs: { base_sha: BASE, head_sha: HEAD } },
    'projects/1/repository/compare': { diffs: changed.map(change) },
    'projects/1/repository/files/.gitlab-ci.yml/raw': { __raw: ci },
    'projects/1/repository/files/ci%2Freplay.yml/raw': { __raw: 'belay-replay:\n  script: ./gradlew test\n' },
    'projects/1/jobs/9001': { id: 9001, name: 'belay-proof-exploit-test', pipeline: { id: 300, sha: HEAD }, ...job },
    'projects/1/pipelines/300': { id: 300, sha: HEAD, source: 'merge_request_event', status: 'success', ...pipeline },
    'projects/1/pipelines/300/variables': variables,
    [ART]: typeof art === 'object' && art.__http ? art : { __raw: JSON.stringify(art) },
  };
}

function check(name, opts) {
  const out = path.join(dir, `${name}.json`);
  fs.writeFileSync(out, 'stale'); // a refusal must not leave an earlier file to post
  const r = runScript(dir, 'hand/check-proof.mjs', ['--mr', '7', '--job', '9001', '--out', out], { routes: routes(opts) });
  expect(r.writes).toEqual([]);
  return { r, written: fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null };
}

describe('check-proof (M1 hand-run step 1, F90)', { timeout: 180_000 }, () => {
  it('writes the proof for a merge request pipeline of the head with no variables and no CI change', () => {
    const { r, written } = check('ok');
    expect(r.code, r.stderr).toBe(0);
    expect(JSON.parse(written)).toEqual(proof());
    expect(r.reads).toContain('projects/1/pipelines/300/variables');
  });

  it('a pipeline with variables: posts nothing', () => {
    const { r, written } = check('vars', { variables: [{ key: 'BELAY_GUARDRAIL_AUTHORS', value: 'ai-patcher-acme', variable_type: 'env_var' }] });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/ran with 1 pipeline variable\(s\)/);
    expect(written).toBeNull();
  });

  it('an MR that changes its CI configuration, by ci-touch.mjs: posts nothing', () => {
    const cases = {
      'ci-file': [{ changed: ['.gitlab-ci.yml'] }, /it changes the CI file \.gitlab-ci\.yml/],
      'dot-gitlab': [{ changed: ['.gitlab/ci/extra.yml'] }, /it changes \.gitlab\/ci\/extra\.yml/],
      include: [{ changed: ['ci/replay.yml'] }, /it changes ci\/replay\.yml, which the CI configuration includes/],
      unresolved: [{ ci: 'include:\n  - local: ci/$JOBS.yml\n' }, /a path with a variable: treated as changed/],
    };
    for (const [name, [opts, why]] of Object.entries(cases)) {
      const { r, written } = check(name, opts);
      expect(r.code, name).toBe(1);
      expect(r.stderr).toMatch(why);
      expect(written).toBeNull();
    }
  });

  it('a proof that is not pass, or not for the current head, or not from an MR pipeline of the head: posts nothing', () => {
    const cases = {
      fail: [{ art: proof({ verdict: 'fail' }) }, /verdict is fail, not pass/],
      stale: [{ art: proof({ task: { head_sha: OLD } }) }, /is for cccccccc, not the MR's current head aaaaaaaa: stale/],
      'other-job': [{ job: { name: 'unit-tests' } }, /is unit-tests, not a belay-proof-<class> job/],
      'other-sha': [{ pipeline: { sha: OLD } }, /pipeline 300 ran for cccccccc/],
      'push-pipeline': [{ pipeline: { source: 'push' } }, /a push pipeline, not a merge request pipeline/],
      'not-proof': [{ art: { verdict: 'pass' } }, /not a belay\.proof\/1 block/],
    };
    for (const [name, [opts, why]] of Object.entries(cases)) {
      const { r, written } = check(name, opts);
      expect(r.code, name).toBe(1);
      expect(r.stderr).toMatch(why);
      expect(written).toBeNull();
    }
  });

  it('a variables read that fails: nothing written, never "no variables"', () => {
    const { r, written } = check('forbidden', { variables: { __http: 403, message: '403 Forbidden' } });
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/a read failed, nothing written: .*403/);
    expect(written).toBeNull();
  });
});
