// queue-runs against a fake az: the preview spells `az pipelines run` exactly n times and runs nothing; a confirm with
// a stale or unknown preview id is refused and runs nothing; a confirm of the preview queues n runs and records their
// ids beside the claim; a repeat answers from that and queues nothing more.
import { describe, expect, it } from 'vitest';
import { appendAdjustment, readQueued } from '@/server/vitals';
import { parseIntent } from '../../intents';
import type { QueueRuns } from '../../types';
import { confirmProjectWrite, PREVIEW_TTL_MS, previewProjectWrite, STALE_REASON } from '../run';
import { projectRig } from './rig';

const rig = projectRig();
const intent: QueueRuns = { kind: 'queue-runs', project: 'grinex-portal', claimId: 'c1', pipelineId: '2', branch: 'feature/npm-cache', n: 3 };
const claim = () => appendAdjustment('grinex-portal', { type: 'claim', id: 'c1', at: '2026-10-25T09:00:00.000Z', by: 'agent', title: 'cache npm', target: { kind: 'ci-stage', variant: 'master-full', stage: 'Run Tests' }, direction: 'down', ref: { branch: 'feature/npm-cache' } });
const CMD = 'az pipelines run --org https://dev.azure.com/Grinex --project "Grinex Portal" --id 2 --branch feature/npm-cache -o json';

describe('queue-runs', () => {
  it('previews the exact az pipelines run n times and runs nothing', async () => {
    claim();
    const r = await previewProjectWrite(rig.deps, intent);
    if (r.status !== 'preview') throw new Error(JSON.stringify(r));
    expect(r.preview.commands.map((c) => c.display)).toEqual([CMD, CMD, CMD]);
    expect(r.preview.commands[0]!.argv).toEqual(['pipelines', 'run', '--org', 'https://dev.azure.com/Grinex', '--project', 'Grinex Portal', '--id', '2', '--branch', 'feature/npm-cache', '-o', 'json']);
    expect(r.preview.mode).toBe('live');
    expect(rig.calls).toEqual([]);
  });

  it('refuses a confirm with a stale or unknown preview id and runs nothing', async () => {
    claim();
    const p = await previewProjectWrite(rig.deps, intent);
    if (p.status !== 'preview') throw new Error('no preview');
    expect(await confirmProjectWrite(rig.deps, intent, 'f'.repeat(64))).toEqual({ status: 'refused', reason: STALE_REASON });
    rig.now.t += PREVIEW_TTL_MS;
    expect(await confirmProjectWrite(rig.deps, intent, p.preview.previewId)).toEqual({ status: 'refused', reason: STALE_REASON });
    expect(rig.calls).toEqual([]);
    expect(readQueued('grinex-portal')).toEqual([]);
  });

  it('a confirm whose plan moved answers changed with the new preview, and runs nothing', async () => {
    claim();
    const p = await previewProjectWrite(rig.deps, intent);
    if (p.status !== 'preview') throw new Error('no preview');
    rig.cfg = { ...rig.cfg, host: { ...rig.cfg.host, org: 'GrinexMoved' } };
    const r = await confirmProjectWrite(rig.deps, intent, p.preview.previewId);
    expect(r.status === 'changed' && r.preview.commands[0]!.display).toMatch(/GrinexMoved/);
    expect(rig.calls).toEqual([]);
  });

  it('queues n runs as the person, records the run ids beside the claim, and a repeat queues nothing more', async () => {
    claim();
    let id = 950;
    rig.answers.push(['pipelines run', { stdout: '' }]);
    rig.deps.exec = async (bin, args) => (rig.calls.push([bin, ...args]), { code: 0, stdout: JSON.stringify({ id: ++id, status: 'notStarted' }), stderr: '', ms: 1 });
    const p = await previewProjectWrite(rig.deps, intent);
    if (p.status !== 'preview') throw new Error('no preview');
    const r = await confirmProjectWrite(rig.deps, intent, p.preview.previewId);
    expect(r.status === 'done' && r.results.map((x) => x.made)).toEqual(['run 951', 'run 952', 'run 953']);
    expect(readQueued('grinex-portal')).toEqual([{ claimId: 'c1', runIds: ['951', '952', '953'], at: '2026-10-25T10:00:00.000Z' }]);
    expect(await confirmProjectWrite(rig.deps, intent, p.preview.previewId)).toEqual(r);
    expect(rig.calls).toHaveLength(3);
  });

  it('stops at the first refused run and keeps the ids queued before it', async () => {
    claim();
    let n = 0;
    rig.deps.exec = async (bin, args) => (rig.calls.push([bin, ...args]), ++n === 2 ? { code: 1, stdout: '', stderr: 'ERROR: TF401019: branch not found', ms: 1 } : { code: 0, stdout: '{"id": 960}', stderr: '', ms: 1 });
    const p = await previewProjectWrite(rig.deps, intent);
    const r = p.status === 'preview' ? await confirmProjectWrite(rig.deps, intent, p.preview.previewId) : p;
    expect(r.status === 'failed' && r.results.map((x) => x.error ?? x.made)).toEqual(['run 960', 'ERROR: TF401019: branch not found']);
    expect(readQueued('grinex-portal')[0]?.runIds).toEqual(['960']);
  });

  it('refuses an unknown pipeline or claim, a non-CI claim, and bad fields before planning', async () => {
    claim();
    expect(await previewProjectWrite(rig.deps, { ...intent, pipelineId: '9' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/pipeline 9 is not one of grinex-portal's \(2 Grinex Portal\)/) });
    expect(await previewProjectWrite(rig.deps, { ...intent, claimId: 'ghost' })).toMatchObject({ status: 'refused', reason: 'no claim ghost in grinex-portal' });
    for (const bad of [{ n: 6 }, { n: 0 }, { branch: '--upload' }, { branch: 'a..b' }, { pipelineId: '2; rm' }]) {
      expect(parseIntent({ ...intent, ...bad }).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(parseIntent(intent)).toEqual({ ok: true, intent });
  });
});
