import { describe, expect, it } from 'vitest';
import type { MergeNeed } from '@/lib/runs/desk/types';
import { lane, wave } from './wave.fixture';
import { waveStateOf } from './waveState';

const need = (r: string, n: number, checked = true): MergeNeed => ({ kind: 'merge-wave', id: `merge:${r}:${n}`, repo: r, wave: n, branch: `belay/wave-${n}`, base: 'main', landed: 1, checked, commands: [] });
const ok = wave('a', 1, { mergeable: true, branch: 'belay/wave-1', lanes: [lane('x', { outcome: 'landed' })] });

describe("a wave's state, said no further than the data goes", () => {
  it('mergeable only when the desk names it and git was asked; named by nobody it is in its base already, or gone', () => {
    expect(waveStateOf(ok, [need('a', 1)])).toBe('take');
    expect(waveStateOf(ok, [need('a', 2), need('b', 1)])).toBe('in');
    expect(waveStateOf(ok, [])).toBe('in');
  });

  it("without the desk's answer, or when git could not be asked, it says git was not asked, never a guess", () => {
    expect(waveStateOf(ok, undefined)).toBe('unasked');
    expect(waveStateOf(ok, [need('a', 1, false)])).toBe('unasked');
  });

  it('running, unfinished, and not mergeable need no desk', () => {
    expect(waveStateOf(wave('a', 1, { running: true }), undefined)).toBe('running');
    expect(waveStateOf(wave('a', 1), [])).toBe('unfinished');
    expect(waveStateOf(wave('a', 1, { mergeable: false }), undefined)).toBe('blocked');
    expect(waveStateOf(wave('a', 1, { mergeable: true }), [need('a', 1)])).toBe('blocked'); // no branch: nothing to take
  });
});
