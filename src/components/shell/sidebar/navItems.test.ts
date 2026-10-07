import { describe, expect, it } from 'vitest';
import { APP_NAV, SETTINGS_NAV, activeNavKey } from './navItems';

describe('activeNavKey', () => {
  it('leaves the front door out of the nav', () => {
    expect(activeNavKey('/')).toBeNull();
    expect(activeNavKey('/fleet')).toBe('fleet');
  });
  it('matches a screen and its sub-paths', () => {
    expect(activeNavKey('/needs-you')).toBe('needs-you');
    expect(activeNavKey('/task')).toBe('task');
    expect(activeNavKey('/monitor')).toBe('monitor');
    expect(activeNavKey('/cycles')).toBe('cycles');
    expect(activeNavKey('/task/01J8Q4')).toBe('task');
    expect(activeNavKey('/settings')).toBe('settings');
  });
  it('matches nothing for routes outside the nav', () => {
    expect(activeNavKey('/kit')).toBeNull();
    expect(activeNavKey('/tasks')).toBeNull();
  });
});

describe('nav data', () => {
  it('lists the nine screens in order, Settings apart', () => {
    expect(APP_NAV.map((e) => e.label)).toEqual(['Fleet', 'Monitor', 'Needs you', 'Ladder', 'Maturity', 'Cycles', 'Task', 'Setup', 'Theater']);
    expect(SETTINGS_NAV.href).toBe('/settings');
    expect(APP_NAV.filter((e) => e.needsYouBadge).map((e) => e.key)).toEqual(['needs-you']);
  });
});
