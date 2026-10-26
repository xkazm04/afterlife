// The orbit's geometry: every step on the ellipse in step order clockwise from twelve, the places grouped with a gap
// between them, a link per state, and the arrow keys wrapping round the orbit.
import { describe, expect, it } from 'vitest';
import { VIEWS } from '../../../model/fixtures/views';
import { SKY, linkOf, moveOf, placeLabels, starsOf } from '../sky';

const stars = starsOf(VIEWS.nothing.steps);

describe('starsOf', () => {
  it('puts every step on the orbit, clockwise from twelve, in step order', () => {
    expect(stars.map((s) => s.step.key)).toEqual(['repo', 'glab', 'login', 'group', 'live', 'stack', 'save', 'unlock']);
    for (const s of stars) expect(((s.at.x - SKY.cx) / SKY.rx) ** 2 + ((s.at.y - SKY.cy) / SKY.ry) ** 2).toBeCloseTo(1, 1);
    const angles = stars.map((s) => s.angle);
    expect(angles[0]).toBeGreaterThan(-90);
    expect(angles.at(-1)).toBeLessThan(270);
    expect([...angles].sort((a, b) => a - b)).toEqual(angles);
  });

  it('leaves a wider gap between two places than between two steps of one place', () => {
    const step = (i: number) => stars[i + 1]!.angle - stars[i]!.angle;
    expect(step(1)).toBeGreaterThan(step(0) * 1.5); // glab (this machine) -> login (GitLab)
    expect(step(3)).toBeGreaterThan(step(4) * 1.5); // group (GitLab) -> live (Afterlife)
    expect(placeLabels(stars).map((p) => p.place)).toEqual(['this machine', 'GitLab', 'Afterlife']);
  });

  it('places every node inside the stage, in percent', () => {
    for (const v of stars.flatMap((s) => [s.pct.x, s.pct.y])) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(100);
    }
  });
});

describe('linkOf and moveOf', () => {
  it('a link per state: amber only for you', () => {
    expect([linkOf('checking'), linkOf('done'), linkOf('todo'), linkOf('blocked'), linkOf('you')]).toEqual(['flow', 'solid', 'muted', 'broken', 'you']);
  });

  it('arrows wrap round the orbit, Home and End jump, anything else is not a move', () => {
    const k = stars.map((s) => s.step.key);
    expect(moveOf(k, 'unlock', 'ArrowRight')).toBe('repo');
    expect(moveOf(k, 'repo', 'ArrowUp')).toBe('unlock');
    expect(moveOf(k, 'login', 'End')).toBe('unlock');
    expect(moveOf(k, 'login', 'a')).toBeNull();
  });
});
