// The model's answer, strictly: what does not fit is dropped and the dropped probes counted; the one call runs with
// the engine's model and effort and no tools, from a temp dir; a missing claude and an invalid answer say which.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { claudeArgs, type AgentCall, type AgentOutcome } from '../../../../runner/agent/spawn';
import type { ProbeResult } from '@/schemas/vitals';
import { ClaudeMissingError, completeProbes, jsonOf, proposeWith, withPipelines } from './propose';
import { ProposalError, parseProposal } from './proposal';

const RAW = {
  name: 'Grinex Portal',
  host: { kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal', repo: 'Grinex Portal', extra: 'x' },
  components: [
    { id: 'app', path: '.', stack: 'python', tests: ['pytest -q'] },
    { id: 'release-log', path: './release-log/', stack: 'python', tests: ['pytest release-log'] },
    { id: 'Bad Id', path: 'x', stack: '' },
    { id: 'escape', path: '../elsewhere', stack: '' },
  ],
  ci: {
    provider: 'azure-pipelines',
    pipelines: [{ id: 2, name: 'Grinex Portal', file: 'azure-pipelines.yml' }, { id: 'pr-validation', file: 'pipelines/pr-validation.yml' }, { name: 'no id' }],
    variants: [
      { id: 'master-hotfix', pipelineId: '2', match: { branch: 'master', parameter: { name: 'LANE', value: 'hotfix' } } },
      { id: 'pr-feature', pipelineId: 'pr-validation', match: { branch: 'feature/*', reason: 'pullRequest' } },
      { id: 'orphan', pipelineId: '99', match: { branch: 'x' } },
      { id: 'no-match', pipelineId: '2', match: {} },
    ],
  },
  cloud: { provider: 'azure-app-insights', hint: { resourceGroup: 'grinex-portal-resource-group', name: null } },
  metrics: [{ name: 'tests', command: 'pytest', parse: { kind: 'wall' }, direction: 'down', threshold: 0.1 }, { name: 'bad', parse: { kind: 'nope' } }],
  probes: [
    { kind: 'az-login', args: {} },
    { kind: 'az-devops-runs', args: { org: 'Grinex', project: 'Grinex Portal', pipelineId: 2 } },
    { kind: 'az-devops-runs', args: { org: 'Grinex', project: 'Grinex Portal', pipelineId: 2 } },
    { kind: 'rm-rf', args: {} },
    { kind: 'az-devops-pipelines', args: { org: 'Grinex' } },
    { kind: 'az-devops-pipelines', args: { org: 'Grinex', project: 'Grinex Portal', top: '5' } },
    { kind: 'az-devops-timeline', args: { org: 'Grinex', project: 'x; rm -rf /', runId: '904' } },
    { kind: 'git-root', args: { path: 'C:\\Windows' } },
  ],
};

describe('parseProposal', () => {
  it('keeps what fits, drops the rest, and counts the dropped probes', () => {
    const { proposal: p, dropped } = parseProposal(RAW);
    expect(dropped).toBe(6);
    expect(p.probes).toEqual([{ kind: 'az-login', args: {} }, { kind: 'az-devops-runs', args: { org: 'https://dev.azure.com/Grinex', project: 'Grinex Portal', pipelineId: '2' } }]);
    expect(p.host).toEqual({ kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal', repo: 'Grinex Portal' });
    expect(p.components.map((c) => [c.id, c.path])).toEqual([['app', '.'], ['release-log', 'release-log']]);
    expect(p.ci.pipelines).toEqual([{ id: '2', name: 'Grinex Portal', file: 'azure-pipelines.yml' }, { id: 'pr-validation', name: 'pipelines/pr-validation.yml', file: 'pipelines/pr-validation.yml' }]);
    expect(p.ci.variants.map((v) => v.id)).toEqual(['master-hotfix', 'pr-feature']);
    expect(p.ci.variants[1]!.match).toEqual({ branch: 'feature/*', reason: ['pullRequest'] });
    expect(p.cloud).toEqual({ provider: 'azure-app-insights', hint: { resourceGroup: 'grinex-portal-resource-group' } });
    expect(p.metrics.map((m) => m.name)).toEqual(['tests']);
  });

  it('an answer that is not an object with a name is an invalid proposal', () => {
    expect(() => parseProposal([])).toThrow(ProposalError);
    expect(() => parseProposal({ host: {} })).toThrow(/names no project/);
    expect(() => jsonOf('I could not decide.')).toThrow(/no JSON object/);
    expect(jsonOf('Here:\n```json\n{"name":"x"}\n```')).toEqual({ name: 'x' });
  });

  it('adds the probe that confirms each line the model left unconfirmed, git first', () => {
    const { proposal } = parseProposal(RAW);
    expect(completeProbes(proposal).map((s) => `${s.kind} ${JSON.stringify(s.args)}`)).toEqual([
      'git-root {}',
      'git-remote {}',
      'git-root {"path":"release-log"}',
      'az-devops-pipelines {"org":"https://dev.azure.com/Grinex","project":"Grinex Portal"}',
      'az-appinsights-component {"resourceGroup":"grinex-portal-resource-group"}',
      'az-login {}',
      'az-devops-runs {"org":"https://dev.azure.com/Grinex","project":"Grinex Portal","pipelineId":"2"}',
    ]);
  });
});

let root = '';
afterEach(() => root && rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const outcome = (o: Partial<AgentOutcome>): AgentOutcome => ({ text: '', isError: false, costUsd: null, model: null, usage: null, sessionId: null, timedOut: false, exitCode: 0, stderr: '', ...o });

describe('proposeWith', () => {
  it('asks once, with the engine, no tools and the facts, from a temp dir, and passes the effort through to claude', async () => {
    root = mkdtempSync(path.join(tmpdir(), 'afterlife-propose-'));
    const calls: AgentCall[] = [];
    const r = await proposeWith(root, { model: 'claude-haiku-5-5', effort: 'low' }, async (c) => (calls.push(c), outcome({ text: JSON.stringify(RAW) })));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ model: 'claude-haiku-5-5', effort: 'low', permissions: { step: 'reflect' } });
    expect(path.resolve(calls[0]!.cwd)).not.toBe(path.resolve(root));
    expect(calls[0]!.prompt).toContain('## Facts');
    expect(r).toMatchObject({ engine: { model: 'claude-haiku-5-5' }, dropped: 6 });
    expect(r.proposal.probes[0]).toEqual({ kind: 'git-root', args: {} });
    expect(claudeArgs('claude-haiku-5-5', { step: 'reflect' }, 'C:\\t\\s.json', undefined, 'low').slice(-2)).toEqual(['--effort', 'low']);
    expect(claudeArgs('m', { step: 'reflect' }, 'C:\\t\\s.json')).not.toContain('--effort');
  });

  it('a claude that cannot start is ClaudeMissingError; a failed call says its first stderr line', async () => {
    root = mkdtempSync(path.join(tmpdir(), 'afterlife-propose-'));
    const engine = { model: 'claude-sonnet-5-5', effort: 'low' } as const;
    await expect(proposeWith(root, engine, async () => outcome({ exitCode: 1, stderr: "'claude' is not recognized as an internal or external command" }))).rejects.toThrow(ClaudeMissingError);
    await expect(proposeWith(root, engine, async () => outcome({ exitCode: 1, stderr: 'API error 529\nmore' }))).rejects.toThrow('claude failed (exit 1): API error 529');
    await expect(proposeWith(root, engine, async () => outcome({ text: 'no idea' }))).rejects.toThrow(ProposalError);
  });

  it('tells the model the pipeline ids the pipelines probe listed, and nothing when it failed', async () => {
    const facts = { root: 'C:/r', remote: 'https://dev.azure.com/Grinex/Grinex%20Portal/_git/Grinex%20Portal', ci: [], manifests: {}, dirs: [], infra: [] };
    const seen: string[] = [];
    const probe = async (s: { kind: string; args: Record<string, string> }): Promise<ProbeResult> => (seen.push(JSON.stringify(s)), { kind: 'az-devops-pipelines', args: s.args, status: 'ok', summary: '6 pipelines', data: { pipelineIds: '2,4' }, at: 'x', ms: 1 });
    expect((await withPipelines(facts, probe)).pipelines).toEqual({ summary: '6 pipelines', data: { pipelineIds: '2,4' } });
    expect(seen).toEqual(['{"kind":"az-devops-pipelines","args":{"org":"Grinex","project":"Grinex Portal"}}']);
    const failed = async (): Promise<ProbeResult> => ({ kind: 'az-devops-pipelines', args: {}, status: 'fail', summary: 'az login', at: 'x', ms: 1 });
    expect((await withPipelines(facts, failed)).pipelines).toBeUndefined();
  });
});
