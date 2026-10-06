import { describe, expect, it } from 'vitest';
import { countLevels, countsText, isDeep, levelFor, modeLabel, nextOf, rungText, shortMr } from './rungs';
import { ctx } from './testCtx';

describe('rung helpers', () => {
  it('writes unknown as ? and never as R0', () => {
    expect(rungText(null)).toBe('?');
    expect(rungText(0)).toBe('R0');
    expect(rungText(3)).toBe('R3');
  });

  it('shortens the policies project in MR ids', () => {
    expect(shortMr('ledgerline-policies!6')).toBe('pol!6');
    expect(shortMr('!45')).toBe('!45');
    expect(shortMr(null)).toBe('');
  });

  it('next is the scan next until reached, then one above, capped at R4', () => {
    expect(nextOf(1, 2)).toBe(2);
    expect(nextOf(2, 2)).toBe(3);
    expect(nextOf(4, 4)).toBe(4);
    expect(nextOf(null, 2)).toBe(2);
  });

  it('draws day 0, now or the target by mode; unknown stays unknown', () => {
    const monitor = ctx.base.monitor;
    expect(levelFor('day0', monitor, 1)).toBeNull();
    expect(levelFor('now', monitor, 1)).toBe(1);
    expect(levelFor('target', monitor, 1)).toBe(2);
    expect(levelFor('now', monitor, null)).toBeNull();
  });

  it('deep means R3 or higher', () => {
    expect([null, 0, 2, 3, 4].map(isDeep)).toEqual([false, false, false, true, true]);
  });

  it('counts the nine stages as the status bar does', () => {
    const levels = ctx.stages.map((s) => ctx.base[s].now);
    const c = countLevels(levels);
    expect(c).toEqual({ total: 9, deep: 3, running: 4, configured: 2, absent: 0, unknown: 0 });
    expect(countsText(c)).toBe('9 stages · 3 deep · 6 touched (4 running, 2 configured) · 0 absent · ');
  });

  it('counts a day 0 monitor as unknown', () => {
    const c = countLevels(ctx.stages.map((s) => ctx.base[s].day0));
    expect(c.unknown).toBe(1);
    expect(c.absent).toBe(6);
  });

  it('labels the modes', () => {
    expect(modeLabel('day0', '14:02')).toBe('Day 0');
    expect(modeLabel('now', '14:02')).toBe('Now · scan 14:02');
    expect(modeLabel('target', '14:02')).toBe('Target · not earned');
  });
});
