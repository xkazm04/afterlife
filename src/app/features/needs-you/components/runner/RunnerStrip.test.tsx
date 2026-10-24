// No DOM: the strip is rendered to markup; the counts' wording is the pure runnerCounts.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import { RunnerSheet, RunnerStrip, runnerCounts } from './RunnerStrip';

const merge = (wave: number): RunnerNeed => ({
  kind: 'merge-wave', id: `merge:alpha:${wave}`, repo: 'alpha', wave, branch: `belay/wave-${wave}`, base: 'main', path: '/w/alpha', landed: 3, costUsd: 1.5, checked: true, commands: [],
});
const park = (lane: string): RunnerNeed => ({ kind: 'parked-lane', id: `park:alpha:2:${lane}`, repo: 'alpha', wave: 2, lane, title: 'Bump the lockfile' });
const strip = (needs: readonly RunnerNeed[]) => renderToStaticMarkup(<RunnerStrip needs={needs} onOpen={() => {}} />);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('RunnerStrip', () => {
  it('draws nothing when nothing waits', () => expect(strip([])).toBe(''));
  it('counts the merges and the parked lanes, one and many, and leaves a zero part out', () => {
    expect(runnerCounts([merge(1), park('b')])).toBe('1 merge · 1 parked');
    expect(runnerCounts([merge(1), merge(2), park('a'), park('b'), park('c')])).toBe('2 merges · 3 parked');
    expect(runnerCounts([merge(1), merge(2)])).toBe('2 merges');
    expect(runnerCounts([park('a')])).toBe('1 parked');
  });
  it('is one line, the counts and Open, with no card drawn until the sheet opens', () => {
    const out = strip([merge(2), park('b')]);
    expect(text(out)).toBe('From the cycle runner · 1 merge · 1 parked Open');
    expect(out).toContain('aria-label="From the cycle runner"');
    expect(out).toContain('aria-haspopup="dialog"');
    expect(out).not.toContain('Bump the lockfile');
    expect(out).not.toContain('<li');
  });
  it('opens as a sheet titled for the runner, the counts and the runs link under it, holding the cards', () => {
    const out = renderToStaticMarkup(<RunnerSheet needs={[merge(2), park('b')]} onClose={() => {}} />);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('>From the cycle runner</h2>');
    expect(out).toContain('1 merge · 1 parked');
    expect(out).toContain('href="/runs"');
    expect(out).toContain('Wave 2 of alpha');
    expect(out).toContain('Bump the lockfile');
  });
});
