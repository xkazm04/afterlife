import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_NAV, APP_NAV, SETTINGS_NAV, activeNavKey, navEntryFor } from './navItems';

// The routes are the ground truth: a top-level route folder that holds a page.tsx is a screen. Route groups add no URL
// segment, so their folders are searched as top level (the windowed screens live in "(app)"). The screens the nav leaves out
// on purpose: the kit gallery, and About (full-bleed outside the window, reached from the front door); the front door is the
// "(door)" group's own page and has no folder name.
const APP_DIR = join(process.cwd(), 'src/app');
const NAV_EXEMPT = ['about', 'kit'];
const screenFolders = (dir = APP_DIR): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => (d.name.startsWith('(') ? screenFolders(join(dir, d.name)) : existsSync(join(dir, d.name, 'page.tsx')) ? [d.name] : []))
    .sort();

describe('nav entries against the routes', () => {
  it('every screen folder is in the nav or is an exemption, and every nav entry is a screen folder', () => {
    const inNav = [...APP_NAV, SETTINGS_NAV].map((e) => e.key).sort();
    expect(screenFolders()).toEqual([...inNav, ...NAV_EXEMPT].sort());
  });
  it('each entry links to its own key (Settings to its first page, so the click is the screen host’s)', () => {
    for (const e of APP_NAV) expect(e.href).toBe(`/${e.key}`);
    expect(SETTINGS_NAV.href).toBe('/settings/display');
    expect(navEntryFor(SETTINGS_NAV.href)).toBe(SETTINGS_NAV);
  });
});

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
    expect(activeNavKey('/start')).toBe('start');
    expect(activeNavKey('/onboard/estate')).toBe('start');
    expect(activeNavKey('/vitals/grinex-portal')).toBe('vitals');
    expect(activeNavKey('/task/01J8Q4')).toBe('task');
    expect(activeNavKey('/settings')).toBe('settings');
    for (const p of ['/settings/display', '/settings/data', '/settings/keyboard', '/settings/about']) expect(activeNavKey(p)).toBe('settings');
    expect(activeNavKey('/settingsx')).toBeNull();
  });
  it('matches nothing for routes outside the nav', () => {
    expect(activeNavKey('/kit')).toBeNull();
    expect(activeNavKey('/tasks')).toBeNull();
  });
});

describe('nav data', () => {
  it('lists the twelve screens in order, Vitals first, Settings apart', () => {
    expect(APP_NAV.map((e) => e.label)).toEqual(['Vitals', 'Fleet', 'Monitor', 'Needs you', 'Ladder', 'Maturity', 'Cycles', 'Task', 'Set up', 'Setup', 'Theater', 'Runs']);
    expect(SETTINGS_NAV.href).toBe('/settings/display');
    expect(APP_NAV.filter((e) => e.needsYouBadge).map((e) => e.key)).toEqual(['needs-you']);
  });
});

describe('the one screen list', () => {
  it('ALL_NAV is the app screens then Settings, and navEntryFor finds the entry', () => {
    expect(ALL_NAV).toEqual([...APP_NAV, SETTINGS_NAV]);
    expect(navEntryFor('/settings/keys')?.label).toBe('Settings');
    expect(navEntryFor('/')).toBeNull();
  });
  // A new pinned entry reaches every consumer only if nobody re-assembles the list: the spread lives in navItems.ts alone.
  it('no production site re-assembles [...APP_NAV, SETTINGS_NAV]', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(join(dir, d.name)) : /\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [join(dir, d.name)] : [],
      );
    const spreads = walk(join(process.cwd(), 'src')).filter((f) => /\.\.\.APP_NAV, SETTINGS_NAV/.test(readFileSync(f, 'utf8')));
    expect(spreads.map((f) => f.replaceAll('\\', '/').split('/src/')[1])).toEqual(['components/shell/sidebar/navItems.ts']);
  }, 120_000); // walks the whole src/ tree: seconds alone, past the 30 s default under a loaded full suite
});
