import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WAVE_1, WAVE_2_RUNNING } from '@/app/features/runs/model/fixture';
import { loadLivePayload } from './livePayload';

let root = '';
afterEach(() => root && rmSync(root, { recursive: true, force: true }));

describe('loadLivePayload', () => {
  it('is readRuns()\'s data plus the newest wave\'s meta', () => {
    root = mkdtempSync(join(tmpdir(), 'belay-live-'));
    const dir = join(root, 'runs', 'alpha');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '1.jsonl'), WAVE_1.join('\n'));
    writeFileSync(join(dir, '2.jsonl'), WAVE_2_RUNNING.join('\n'));
    const p = loadLivePayload(root);
    expect(p.repos[0]!.waves.map((w) => w.wave)).toEqual([2, 1]);
    expect(Object.keys(p.meta)).toEqual(['alpha/2']);
    expect(p.meta['alpha/2']).toMatchObject({ lastEventAt: '2026-10-18T09:01:00Z', waveCapUsd: 10, lanesPlanned: 1, laneStartedAt: { a: '2026-10-18T09:00:01Z' } });
  });

  it('no runs directory: empty, with a clock', () => {
    root = mkdtempSync(join(tmpdir(), 'belay-live-'));
    expect(loadLivePayload(root)).toMatchObject({ repos: [], meta: {} });
  });
});
