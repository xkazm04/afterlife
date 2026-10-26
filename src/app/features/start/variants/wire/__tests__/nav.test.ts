// The wire's pure parts: keys on the tab list, the segment states, the place bands and the sweep order.
import { describe, expect, it } from 'vitest';
import { VIEWS } from '../../../model/fixtures/views';
import { bandOf, keyOf, litRanks, segOf } from '../nav';

describe('keyOf', () => {
  it('arrows step and stop at the ends, Home/End jump, Enter opens, Esc closes, anything else is not ours', () => {
    expect(keyOf('ArrowRight', 2, 8)).toEqual({ to: 3 });
    expect(keyOf('ArrowDown', 7, 8)).toEqual({ to: 7 });
    expect(keyOf('ArrowLeft', 0, 8)).toEqual({ to: 0 });
    expect(keyOf('ArrowUp', 4, 8)).toEqual({ to: 3 });
    expect(keyOf('Home', 5, 8)).toEqual({ to: 0 });
    expect(keyOf('End', 1, 8)).toEqual({ to: 7 });
    expect(keyOf('Enter', 1, 8)).toBe('open');
    expect(keyOf('Escape', 1, 8)).toBe('close');
    expect(keyOf('a', 1, 8)).toBeNull();
    expect(keyOf(' ', 1, 8)).toBeNull();
  });
});

describe('segOf', () => {
  it('flows into each checking node, idle where nothing is reached', () => {
    const s = VIEWS.checking.steps;
    const flowing = s.map((_, i) => segOf(s, i)).flatMap((g, i) => (g === 'flow' ? [s[i]!.key] : []));
    expect(flowing).toEqual(s.filter((x, i) => i > 0 && x.state === 'checking').map((x) => x.key));
    expect(flowing.length).toBeGreaterThan(0);
    expect(segOf(s, 0)).toBe('idle');
  });

  it('all done: every segment after the first node is lit', () => {
    const s = VIEWS.done.steps;
    expect(s.map((_, i) => segOf(s, i))).toEqual(['idle', ...Array(7).fill('lit')]);
  });
});

describe('bandOf', () => {
  it('three bands: this machine, GitLab, Afterlife', () => {
    const s = VIEWS.nothing.steps;
    const firsts = s.flatMap((x, i) => (bandOf(s, i).first ? [x.place] : []));
    const lasts = s.filter((_, i) => bandOf(s, i).last).length;
    expect(firsts).toEqual(['this machine', 'GitLab', 'Afterlife']);
    expect(lasts).toBe(3);
  });
});

describe('litRanks', () => {
  it('newly lit segments sweep one after another; ones lit before keep 0', () => {
    expect(litRanks(null, [false, true, true, false])).toEqual([0, 0, 1, 0]);
    expect(litRanks([false, true, false, false, false], [false, true, true, false, true])).toEqual([0, 0, 0, 0, 1]);
    expect(litRanks([false, true, true], [false, true, true])).toEqual([0, 0, 0]);
  });
});
