import { describe, expect, it } from 'vitest';
import { reduce, type Action } from '../reducer';
import { initialState, type MaturityState } from '../state';
import { ctx } from '../testCtx';
import { routeViews } from './routes';

const run = (s: MaturityState, ...a: Action[]) => a.reduce((acc, x) => reduce(acc, x, ctx), s);
const view = (s: MaturityState, stage: string) => {
  const v = routeViews(s, ctx).find((r) => r.stage === stage);
  if (!v) throw new Error(stage);
  return v;
};

describe('routeViews', () => {
  const s0 = initialState(ctx);

  it('draws nine routes at their current rung in Now', () => {
    const v = routeViews(s0, ctx);
    expect(v).toHaveLength(9);
    expect(v.map((r) => r.lv)).toEqual([1, 2, 3, 2, 3, 2, 2, 1, 3]);
    expect(v.filter((r) => r.deep).map((r) => r.stage)).toEqual(['verify', 'secure', 'govern']);
  });

  it('puts a pickable gap tag on the next bolt, labelled with its id and a tick when picked', () => {
    expect(view(s0, 'secure').clip).toMatchObject({ id: 'g1', label: 'g1 ✓', picked: true, sent: false });
    expect(view(s0, 'release').clip).toMatchObject({ id: 'g3', label: 'g3', picked: false });
    expect(view(s0, 'secure').clip?.ariaLabel).toMatch(/^Unpick gap g1/);
    expect(view(s0, 'release').clip?.ariaLabel).toMatch(/^Pick gap g3/);
    expect(view(s0, 'plan').clip).toBeNull();
    expect(view(s0, 'plan').ring).toBe(2);
  });

  it('turns the tag into the MR id once sent, and drops it when credited', () => {
    const sent = run(s0, { type: 'go', step: 3 }, { type: 'send' });
    expect(view(sent, 'secure').clip).toMatchObject({ label: '!45', sent: true, picked: false });
    expect(view(sent, 'create').clip?.label).toBe('pol!6');
    const credited = run(sent, { type: 'merge', id: 'g2' }, { type: 'rescanGap', id: 'g2' });
    expect(view(credited, 'create').clip).toBeNull();
    expect(view(credited, 'create').lv).toBe(3);
    expect(view(credited, 'create').deep).toBe(true);
  });

  it('shows the probe as "probed" once run', () => {
    const s = run(s0, { type: 'togglePick', id: 'g4' }, { type: 'go', step: 3 }, { type: 'send' });
    expect(view(s, 'monitor').clip?.label).toBe('probed');
  });

  it('Day 0: draws the day-0 high point, no rings, no chalk; an unknown stays unknown', () => {
    const d = run(s0, { type: 'mode', mode: 'day0' });
    expect(view(d, 'verify').lv).toBe(1);
    expect(view(d, 'monitor').lv).toBeNull();
    expect(view(d, 'monitor').ariaLabel).toBe('monitor: ? unknown');
    expect(routeViews(d, ctx).every((r) => r.ring === null && !r.chalk && r.clip === null)).toBe(true);
  });

  it('Target: draws the next bolt on every route while keeping the earned rung', () => {
    const t = run(s0, { type: 'mode', mode: 'target' });
    expect(view(t, 'secure').lv).toBe(4);
    expect(view(t, 'secure').now).toBe(3);
    expect(view(t, 'verify').lv).toBe(4);
  });

  it('marks the selected route', () => {
    expect(routeViews(s0, ctx).filter((r) => r.selected).map((r) => r.stage)).toEqual(['secure']);
  });
});
