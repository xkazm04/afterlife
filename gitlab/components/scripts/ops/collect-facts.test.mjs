// collect-facts keeps what the engine's scan decides on: the project's URL and merge-requires-pipeline setting, the latest
// green pipeline's URL and time, each job's id, URL, finish time and artifact types, and the issue templates. Every read is
// a GET: nothing is written. The facts it writes are what `engine/cli.ts scan` reads.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
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
