// The live header and stage rendered to markup for the fixture's running wave, a stale one, and the last wave.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WAVE_1, WAVE_2_RUNNING } from '@/app/features/runs/model/fixture';
import { foldRuns, foldWave } from '@/app/features/runs/model/fold';
import { parseRunLine } from '@/app/features/runs/model/parse';
import type { RunEvent } from '@/schemas/run/run';
import { waveMetaOf } from './model/meta';
import { selectLive } from './model/select';
import { waveKey, type LivePayload } from './model/types';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
const { LiveStage } = await import('./components/LiveStage');

const ev = (l: string[]) => l.map(parseRunLine).filter((e): e is RunEvent => e !== null);
const payload = (...lines: string[][]): LivePayload => {
  const evs = lines.map(ev);
  const waves = evs.map((e) => foldWave(e, false)!);
  const meta: LivePayload['meta'] = {};
  evs.forEach((e, i) => (meta[waveKey(waves[i]!.repo, waves[i]!.wave)] = waveMetaOf(e)!));
  return { ...foldRuns(waves, 0), meta, generatedAt: 0 };
};
const T = Date.parse('2026-10-18T09:01:05Z');
const draw = (p: LivePayload, now: number, present = false) => renderToStaticMarkup(<LiveStage v={selectLive(p, now)} present={present} />);

describe('LiveStage', () => {
  it('a running wave: LIVE badge, the four answers, the hero lane and a link to /runs', () => {
    const out = draw(payload(WAVE_1, WAVE_2_RUNNING), T);
    for (const s of ['LIVE', 'alpha · wave 2 · lane 1/1', 'Trim the changelog', '0 landed', '$0.01 of $10.00', '1 mergeable wave', 'href="/runs"', '1m 4s']) expect(out).toContain(s);
    expect(out).not.toContain('STALE');
  });

  it('a quiet runner: the STALE badge and a frozen frame', () => {
    const out = draw(payload(WAVE_2_RUNNING), T + 5 * 60_000);
    expect(out).toContain('LIVE · STALE');
    expect(out).toContain('frozen at the last event');
    expect(out).toContain('59s');
  });

  it('no wave running: LAST WAVE, the outcome rail, no running hero', () => {
    const out = draw(payload(WAVE_1), T);
    expect(out).toContain('LAST WAVE');
    expect(out).toContain('Last wave');
    expect(out).toContain('Bump the lockfile');
    expect(out).toContain('parked');
    expect(out).not.toContain('Running lane');
  });

  it('present keeps the same facts', () => {
    expect(draw(payload(WAVE_2_RUNNING), T, true)).toContain('data-present');
  });

  it('no runs: says so', () => {
    expect(draw(foldRunsEmpty(), T)).toContain('No runs yet');
  });
});

function foldRunsEmpty(): LivePayload {
  return { ...foldRuns([], 0), meta: {}, generatedAt: 0 };
}
