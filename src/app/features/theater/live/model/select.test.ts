// The live film's pure selectors, on the runs fixture: header facts, stale detection with an injected clock, and the
// film precedence.
import { describe, expect, it } from 'vitest';
import { WAVE_1, WAVE_2_RUNNING } from '@/lib/runs/fixture';
import { foldRuns, foldWave } from '@/lib/runs/fold';
import { parseRunLine } from '@/lib/runs/parse';
import type { RunEvent } from '@/schemas/run/run';
import { waveMetaOf } from './meta';
import { theaterMode } from './mode';
import { hasRunningWave, isStale, selectLive, STALE_MS } from './select';
import { waveKey, type LivePayload } from './types';

const ev = (l: string[]) => l.map(parseRunLine).filter((e): e is RunEvent => e !== null);
const payload = (lines: string[][]): LivePayload => {
  const evs = lines.map(ev);
  const waves = evs.map((e) => foldWave(e, false)!);
  const meta: LivePayload['meta'] = {};
  evs.forEach((e, i) => (meta[waveKey(waves[i]!.repo, waves[i]!.wave)] = waveMetaOf(e)!));
  return { ...foldRuns(waves, 0), meta, generatedAt: 0 };
};
const T = Date.parse('2026-10-18T09:01:00Z'); // the running fixture's newest event

describe('selectLive', () => {
  const p = payload([WAVE_1, WAVE_2_RUNNING]);

  it('a running wave answers the four questions', () => {
    const v = selectLive(p, T + 5000);
    expect(v).toMatchObject({ phase: 'running', repo: 'alpha', wave: 2, stale: false, lanesTotal: 1, laneN: 1, landed: 0, parked: 0, failed: 0, mergeable: 1, capUsd: 10 });
    expect(v.current?.title).toBe('Trim the changelog');
    expect(v.costUsd).toBeCloseTo(0.01);
    expect(v.elapsedSec).toBe(64); // lane.start 09:00:01 -> now 09:01:05
  });

  it('with none running, the newest finished wave is the last wave and has no hero lane', () => {
    const v = selectLive(payload([WAVE_1]), T);
    expect(v).toMatchObject({ phase: 'last', wave: 1, landed: 1, parked: 1, lanesTotal: 2, mergeable: 1 });
    expect(v.current).toBeUndefined();
    expect(v.finished.map((l) => l.lane)).toEqual(['b', 'a']);
  });

  it('a running wave beside a finished one still lists the finished one as replayable', () => {
    const v = selectLive(p, T);
    expect(v.phase).toBe('running');
    expect(v.replayable).toEqual([{ repo: 'alpha', wave: 1 }]);
  });

  it('no waves at all is none', () => {
    expect(selectLive({ ...foldRuns([], 0), meta: {}, generatedAt: 0 }, T)).toMatchObject({ phase: 'none', finished: [] });
  });

  it('stale: over 30 s since the newest event while running freezes the elapsed clock at that event', () => {
    expect(isStale('2026-10-18T09:01:00Z', T + STALE_MS)).toBe(false);
    expect(isStale('2026-10-18T09:01:00Z', T + STALE_MS + 1)).toBe(true);
    const v = selectLive(p, T + 10 * 60_000);
    expect(v.stale).toBe(true);
    expect(v.elapsedSec).toBe(59); // frozen at lane.usage 09:01:00, not 10 minutes on
    expect(selectLive(p, T + 20 * 60_000).elapsedSec).toBe(59);
  });

  it('a finished wave is never stale', () => {
    expect(selectLive(payload([WAVE_1]), T + 99 * 60_000).stale).toBe(false);
  });

  it('hasRunningWave', () => {
    expect(hasRunningWave(p)).toBe(true);
    expect(hasRunningWave(payload([WAVE_1]))).toBe(false);
  });
});

describe('theaterMode: ?mr= > ?live=1 > a running wave > replay', () => {
  it.each([
    [{ mr: '41', live: '1' }, true, 'replay'],
    [{ mr: '41' }, true, 'replay'],
    [{ live: '1' }, false, 'live'],
    [{ live: ['1', '0'] }, false, 'live'],
    [{}, true, 'live'],
    [{}, false, 'replay'],
    [{ live: '0' }, false, 'replay'],
    [{ live: '0' }, true, 'replay'],
    [{ mr: 'x', live: '1' }, false, 'live'],
  ] as const)('%j with a running wave %s plays %s', (params, running, want) => {
    expect(theaterMode(params, running)).toBe(want);
  });
});
