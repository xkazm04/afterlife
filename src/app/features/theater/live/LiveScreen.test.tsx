// The live header and stage rendered to markup for the fixture's running wave, a stale one, and the last wave.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WAVE_1, WAVE_2_RUNNING } from '@/lib/runs/fixture';
import { foldRuns, foldWave } from '@/lib/runs/fold';
import { parseRunLine } from '@/lib/runs/parse';
import type { RunEvent } from '@/schemas/run/run';
import { waveMetaOf } from './model/meta';
import { theaterMode, waveFocusOf } from './model/mode';
import { hasFinishedWave, selectLive } from './model/select';
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

describe('the replay link names the wave it opens', () => {
  const p = payload(WAVE_1, WAVE_2_RUNNING);
  it('the header links each finished wave by repo and wave, not a bare ?live=0', () => {
    const out = draw(p, T);
    expect(out).toContain('href="/theater?live=0&amp;repo=alpha&amp;wave=1"');
    expect(out).toContain('alpha wave 1');
    expect(out).not.toContain('href="/theater?live=0"');
  });

  it('the link resolves to a view of that finished wave while another wave runs', () => {
    const link = selectLive(p, T).replayable[0]!;
    const focus = waveFocusOf({ live: '0', repo: link.repo, wave: String(link.wave) })!;
    expect(theaterMode({ live: '0', repo: link.repo, wave: String(link.wave) }, true)).toBe('wave');
    expect(hasFinishedWave(p, focus)).toBe(true);
    const v = selectLive(p, T, focus);
    expect(v).toMatchObject({ phase: 'last', repo: 'alpha', wave: 1 });
    const out = renderToStaticMarkup(<LiveStage v={v} present={false} />);
    expect(out).toContain('LAST WAVE');
    expect(out).toContain('Last wave · alpha wave 1');
    expect(out).toContain('Bump the lockfile');
  });

  it('a wave the payload does not hold is not focused', () => {
    expect(hasFinishedWave(p, { repo: 'alpha', wave: 2 })).toBe(false);
    expect(selectLive(p, T, { repo: 'nope', wave: 9 }).phase).toBe('running');
  });

  it('?live=0 with no wave keeps the routing it had', () => {
    expect(theaterMode({ live: '0' }, true)).toBe('replay');
    expect(theaterMode({ live: '0' }, false)).toBe('replay');
    expect(waveFocusOf({ live: '0' })).toBeUndefined();
  });
});

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
