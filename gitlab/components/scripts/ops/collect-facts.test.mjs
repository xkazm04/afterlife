// collect-facts keeps what the engine's scan decides on: the project's URL and merge-requires-pipeline setting, the latest
// green pipeline's URL and time, each job's id, URL, finish time and artifact types, and the issue templates. Every read is
// a GET: nothing is written. The facts it writes are what `engine/cli.ts scan` reads.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { parseAllDocuments } from 'yaml';
import { scoreFacts } from '../../../../engine/commands/scan';
import { parseFacts } from '../../../../engine/commands/facts';
import { parseMaturityScan } from '../../../../src/schemas/maturity';
import { runScript, workdir } from '../testing/harness.mjs';

vi.setConfig({ testTimeout: 120_000 });

const dir = workdir('collect-facts');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const WEB = 'https://gitlab.example.com/acme/app';
const routes = {
  'projects/1': { path_with_namespace: 'acme/app', default_branch: 'main', visibility: 'private', web_url: WEB, only_allow_merge_if_pipeline_succeeds: true },
  'projects/1/ci/lint': { valid: true, jobs: [{ name: 'test', stage: 'test', allow_failure: false }] },
  'projects/1/protected_branches': [{ name: 'main' }],
  'projects/1/environments': [],
  'projects/1/approval_rules': [],
  'projects/1/pipeline_schedules': [],
  'projects/1/repository/tree': [{ name: 'maturity-gap.md', type: 'blob' }, { name: 'nested', type: 'tree' }],
  'projects/1/pipelines': [{ id: 77, web_url: `${WEB}/-/pipelines/77`, created_at: '2026-10-07T10:00:00.000Z', status: 'success' }],
  'projects/1/pipelines/77/jobs': [
    { id: 9, name: 'test', stage: 'test', status: 'success', web_url: `${WEB}/-/jobs/9`, finished_at: '2026-10-07T10:09:00.000Z', artifacts: [{ file_type: 'trace' }, { file_type: 'junit' }], token: 'never kept' },
  ],
};
const NONE = { __http: 404, message: '404 File Not Found' };
for (const f of ['CODEOWNERS', '.gitlab/CODEOWNERS', 'docs/CODEOWNERS', '.gitlab/duo/agent-config.yml']) routes[`projects/1/repository/files/${encodeURIComponent(f)}`] = NONE;

function collect(r = routes) {
  const out = path.join(dir, 'facts.json');
  const run = runScript(dir, 'ops/collect-facts.mjs', ['--out', out], { routes: r, env: { CI_DEFAULT_BRANCH: 'main' } });
  return { run, json: JSON.parse(fs.readFileSync(out, 'utf8')) };
}

describe('collect-facts for the maturity scan', () => {
  it('keeps the project URL and its merge-requires-pipeline setting', () => {
    expect(collect().json.facts.project).toEqual({ path: 'acme/app', default_branch: 'main', visibility: 'private', web_url: WEB, merge_requires_pipeline: true });
  });

  it('keeps the pipeline\'s URL and time, and each job\'s id, URL, finish time and artifact types, nothing else', () => {
    expect(collect().json.facts.latest_pipeline_jobs).toEqual({
      pipeline: { id: 77, web_url: `${WEB}/-/pipelines/77`, created_at: '2026-10-07T10:00:00.000Z' },
      jobs: [{ id: 9, name: 'test', stage: 'test', status: 'success', web_url: `${WEB}/-/jobs/9`, finished_at: '2026-10-07T10:09:00.000Z', artifacts: ['trace', 'junit'] }],
    });
  });

  it('lists the issue templates; no templates folder is [], an unreadable one is {error}', () => {
    expect(collect().json.facts.issue_templates).toEqual(['maturity-gap.md']);
    expect(collect({ ...routes, 'projects/1/repository/tree': { __http: 404, message: '404 Tree Not Found' } }).json.facts.issue_templates).toEqual([]);
    expect(collect({ ...routes, 'projects/1/repository/tree': { __http: 403, message: '403 Forbidden' } }).json.facts.issue_templates).toEqual({ error: expect.stringContaining('403') });
  });

  it('reads only: every call is a GET', () => {
    const { run } = collect();
    expect(run.writes).toEqual([]);
    expect(run.reads.length).toBeGreaterThan(0);
  });

  it('writes facts the engine scores and the server parses', () => {
    const scan = scoreFacts(parseFacts(collect().json));
    expect(parseMaturityScan(scan).ok).toBe(true);
    expect(scan.cells.find((c) => c.stage === 'verify')).toMatchObject({ rung: 3, evidence: expect.arrayContaining([{ label: 'job test #9', url: `${WEB}/-/jobs/9` }]) });
  });
});

// F100: the job that runs collect-facts. A pipeline variable (trigger, API, schedule, manual run) outranks a job's own
// `variables:`, so what picks the code that runs beside CI_JOB_TOKEN must come from the inputs, fixed at include time.
describe('the maturity-scan template', () => {
  const doc = parseAllDocuments(fs.readFileSync(path.resolve(import.meta.dirname, '../../templates/maturity-scan/template.yml'), 'utf8'));
  const spec = doc[0].toJS().spec.inputs;
  const jobs = doc[1].toJS();
  const vars = { ...jobs['.belay-boot-maturity-scan'].variables, ...jobs['belay-maturity-scan'].variables };
  const shell = [...jobs['.belay-boot-maturity-scan'].before_script, ...jobs['belay-maturity-scan'].script].join('\n');

  it('no job variable a pipeline variable could override picks the engine, its pin, the glab checksum or the command', () => {
    for (const k of ['BELAY_ENGINE_PROJECT', 'BELAY_ENGINE_REF', 'BELAY_ENGINE_COMMIT', 'BELAY_GLAB_VERSION', 'BELAY_GLAB_SHA256', 'BELAY_SCAN_COMMAND']) {
      expect(vars, k).not.toHaveProperty(k);
    }
    for (const k of ['engine_project', 'engine_ref', 'engine_commit', 'glab_version', 'glab_sha256', 'scan_command']) {
      expect(shell, k).toContain(`$[[ inputs.${k} ]]`);
    }
  });

  it('inputs that reach the shell are shaped by regex, and every default still passes', () => {
    const shapes = { engine_ref: ['v0.1.0', 'main', 'release/1.x', 'a'.repeat(40)], engine_project: ['acme/belay-engine'], engine_commit: ['', 'a'.repeat(40)], glab_sha256: ['', 'b'.repeat(64)], glab_version: ['1.120.0'], scan_command: ['scan'] };
    const bad = { engine_ref: ["v1'; id", '-upload-pack=x', '$(id)'], engine_project: ['a"; id', '$(id)/x'], engine_commit: ['main', 'a'.repeat(39)], glab_sha256: ['x', 'b'.repeat(63)], glab_version: ['1.0; id'], scan_command: ['scan; id', 'scan --facts /tmp/x', '$(id)'] };
    for (const [k, good] of Object.entries(shapes)) {
      const re = new RegExp(spec[k].regex);
      for (const v of [...('default' in spec[k] ? [spec[k].default] : []), ...good]) expect(re.test(v), `${k} accepts ${JSON.stringify(v)}`).toBe(true);
      for (const v of bad[k]) expect(re.test(v), `${k} refuses ${JSON.stringify(v)}`).toBe(false);
    }
  });
});

// F102: facts.json is a 90-day artifact, public on a public project. It keeps what the engine scores, never the merged
// YAML (it can carry files included from private projects), people, schedule owners or environment URLs.
describe('collect-facts keeps nothing the engine does not score', () => {
  const user = { id: 5, username: 'alice', name: 'Alice A', web_url: 'https://gitlab.example.com/alice' };
  const rich = {
    ...routes,
    'projects/1/ci/lint': { valid: true, merged_yaml: 'include: private/secrets.yml\nDEPLOY_KEY: hunter2', includes: [{ location: 'private/secrets.yml' }], errors: [], warnings: [], jobs: [{ name: 'test', stage: 'test', allow_failure: false, script: ['echo hunter2'], before_script: [], tag_list: ['internal-runner'], environment: null, when: 'on_success', only: null, except: null }] },
    'projects/1/protected_branches': [{ id: 3, name: 'main', push_access_levels: [{ user_id: 5, access_level_description: 'Alice A' }], merge_access_levels: [], allow_force_push: false }],
    'projects/1/environments': [{ id: 4, name: 'production', tier: 'production', state: 'available', external_url: 'https://internal.example.net' }],
    'projects/1/approval_rules': [{ id: 6, name: 'Security', rule_type: 'regular', approvals_required: 2, eligible_approvers: [user], users: [user], groups: [{ id: 9, name: 'sec' }] }],
    'projects/1/pipeline_schedules': [{ id: 7, description: 'nightly deploy to db-01.internal', ref: 'main', cron: '0 2 * * *', active: true, owner: user }],
  };

  it('keeps the CI jobs\' name, stage and allow_failure, and drops the merged YAML and includes', () => {
    expect(collect(rich).json.facts.ci_config).toEqual({ valid: true, jobs: [{ name: 'test', stage: 'test', allow_failure: false }] });
  });

  it('keeps names, tiers and counts, never a user, a group, an owner, a description or a URL', () => {
    const { facts } = collect(rich).json;
    expect(facts.protected_branches).toEqual([{ name: 'main' }]);
    expect(facts.environments).toEqual([{ name: 'production', tier: 'production', state: 'available' }]);
    expect(facts.approval_rules).toEqual([{ name: 'Security', rule_type: 'regular', approvals_required: 2 }]);
    expect(facts.schedules).toEqual([{ ref: 'main', cron: '0 2 * * *', active: true }]);
    expect(JSON.stringify(facts)).not.toMatch(/alice|hunter2|internal|private\//i);
  });

  it('an error is one short line', () => {
    const long = { __http: 500, message: `500 ${'x'.repeat(5000)}` };
    const err = collect({ ...rich, 'projects/1/environments': long }).json.facts.environments.error;
    expect(err.length).toBeLessThanOrEqual(200);
  });
});
