// listRuns and the probes against an injected Exec: the argv az receives, the since/maxDays filters, at most four
// timelines in flight, and a lapsed login or a missing az as a `fail` that names the re-login command.
import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import type { Exec } from '../types';
import { ProviderError } from '../probeResult';
import runs from './__fixtures__/runs.json';
import tl904 from './__fixtures__/timeline-904.json';
import { azurePipelines } from '.';

const ORG = 'https://dev.azure.com/Grinex';
const NOW = Date.parse('2026-10-25T10:00:00Z');
const cfg = { slug: 'grinex', host: { kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal' }, ci: { provider: 'azure-pipelines', pipelines: [{ id: '2', name: 'Grinex Portal' }, { id: '8', name: 'Build Android APK' }], variants: [] } } as unknown as ProjectConfig;

function fakeAz(over: Partial<Record<'runs' | 'timeline' | 'account', { code: number; stdout?: string; stderr?: string }>> = {}) {
  const calls: string[][] = [];
  let inFlight = 0;
  let peak = 0;
  const exec: Exec = async (bin, args) => {
    calls.push([bin, ...args]);
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 2));
    inFlight -= 1;
    const which = args[0] === 'devops' ? 'timeline' : args[0] === 'account' ? 'account' : 'runs';
    const o = over[which];
    if (o) return { code: o.code, stdout: o.stdout ?? '', stderr: o.stderr ?? '', ms: 1 };
    if (which === 'timeline') return { code: 0, stdout: JSON.stringify(tl904), stderr: '', ms: 1 };
    const pid = args[args.indexOf('--pipeline-ids') + 1];
    return { code: 0, stdout: JSON.stringify(runs.filter((r) => String(r.definition.id) === pid)), stderr: '', ms: 1 };
  };
  return { exec, calls, peak: () => peak };
}

describe('azure listRuns', () => {
  it('asks each pipeline for its newest 50, with the project as one argv token, and fetches finished runs only', async () => {
    const az = fakeAz();
    const out = await azurePipelines(az.exec, () => NOW).listRuns(cfg);
    expect(az.calls[0]).toEqual(['az', 'pipelines', 'runs', 'list', '--org', ORG, '--project', 'Grinex Portal', '--pipeline-ids', '2', '--top', '50', '-o', 'json']);
    expect(out.map((r) => r.runId)).toEqual(['920', '913', '911', '910', '904', '898']);
    const timelines = az.calls.filter((c) => c[1] === 'devops');
    expect(timelines.map((c) => c.at(-3))).toEqual(expect.arrayContaining(['buildId=913', 'buildId=904']));
    expect(timelines.some((c) => c.includes('buildId=920'))).toBe(false);
    expect(timelines[0]).toContain('project=Grinex Portal');
    expect(az.peak()).toBeLessThanOrEqual(4);
    expect(out.find((r) => r.runId === '911')?.pipelineName).toBe('Build Android APK');
  });

  it('keeps only runs newer than sinceRunId and within maxDays', async () => {
    const out = await azurePipelines(fakeAz().exec, () => NOW).listRuns(cfg, { sinceRunId: '904', maxDays: 1 });
    expect(out.map((r) => r.runId)).toEqual(['920', '913', '911', '910']);
    const old = await azurePipelines(fakeAz().exec, () => NOW).listRuns(cfg, { maxDays: 5 });
    expect(old.some((r) => r.runId === '898')).toBe(false);
  });

  it('a run with no timeline (az prints nothing) has no stages; a failed timeline call throws a ProviderError', async () => {
    const empty = await azurePipelines(fakeAz({ timeline: { code: 0 } }).exec, () => NOW).listRuns(cfg);
    expect(empty.find((r) => r.runId === '910')?.stages).toEqual([]);
    const err = await azurePipelines(fakeAz({ timeline: { code: 1, stderr: 'ERROR: TF400813: not authorized' } }).exec, () => NOW).listRuns(cfg).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).probe).toMatchObject({ kind: 'az-devops-timeline', status: 'fail' });
  });
});

describe('azure probes', () => {
  const p = (exec: Exec) => azurePipelines(exec);

  it('az-login names the subscription; an expired login and a missing az fail with the re-login hint', async () => {
    const ok = await p(fakeAz({ account: { code: 0, stdout: '{"name":"Grinex Portal","id":"sub-1"}' } }).exec).probe({ kind: 'az-login', args: {} });
    expect(ok).toMatchObject({ status: 'ok', summary: 'logged in to Grinex Portal', data: { subscription: 'Grinex Portal' } });
    const expired = await p(fakeAz({ account: { code: 1, stderr: "ERROR: AADSTS700082: The refresh token has expired. Please run 'az login' to setup account." } }).exec).probe({ kind: 'az-login', args: {} });
    expect(expired.status).toBe('fail');
    expect(expired.summary).toMatch(/AADSTS700082.*- run `az login`$/);
    const missing = await p(fakeAz({ account: { code: 127, stderr: 'cannot start az: ENOENT' } }).exec).probe({ kind: 'az-login', args: {} });
    expect(missing).toMatchObject({ status: 'fail', summary: 'cannot start az: ENOENT - install az, then run `az login`' });
  });

  it('az-devops-pipelines counts them and joins their ids; az-devops-runs names the newest', async () => {
    const list = JSON.stringify([2, 4, 5, 6, 7, 8].map((id) => ({ id, name: `p${id}` })));
    const pl = await p(fakeAz({ runs: { code: 0, stdout: list } }).exec).probe({ kind: 'az-devops-pipelines', args: { org: ORG, project: 'Grinex Portal' } });
    expect(pl).toMatchObject({ status: 'ok', summary: '6 pipelines', data: { pipelineIds: '2,4,5,6,7,8', 'pipeline:8': 'p8' } });
    const rs = await p(fakeAz({ runs: { code: 0, stdout: JSON.stringify(runs) } }).exec).probe({ kind: 'az-devops-runs', args: { org: ORG, project: 'Grinex Portal' } });
    expect(rs).toMatchObject({ status: 'ok', summary: '6 runs, newest 2026-10-25', data: { newestRunId: '920' } });
  });

  it('refuses bad args without starting az', async () => {
    const az = fakeAz();
    for (const args of [{ org: 'https://evil.example/Grinex', project: 'x' }, { org: ORG, project: '--query' }, { org: ORG, project: 'x', runId: '1;2' }] as Record<string, string>[]) {
      const r = await p(az.exec).probe({ kind: 'az-devops-timeline', args });
      expect(r.status).toBe('fail');
      expect(r.summary).toMatch(/^bad args/);
    }
    expect(az.calls).toEqual([]);
  });
});
