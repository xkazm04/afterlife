import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// The README's "parts" table is how a screen author finds a shared component. Its set is src/components on disk, not a
// hand list: every exported component (a PascalCase function or const in a .tsx file, as kitCoverage.test.ts reads them)
// must be named in the README, in backticks, or be one of the exemptions below, each with its reason.
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const rel = (f: string): string => relative(__dirname, f).split(sep).join('/');

/** Parts of the shell that Window draws and wires itself from its props: a screen never renders them. */
const BY_WINDOW = ['Backdrop', 'Toolbar', 'Inspector', 'StatusBar', 'Sidebar', 'AppNav', 'NavLink', 'SettingsNav', 'TrafficLights'];
const EXEMPT: Record<string, string> = {
  ...Object.fromEntries(BY_WINDOW.map((n) => [n, 'drawn inside Window; no screen renders it'])),
  Menu: "drawn by useMenu: a screen renders the hook's `menu`, never Menu itself",
};

const exported = walk(__dirname)
  .filter((f) => f.endsWith('.tsx') && !/\.test\.tsx$/.test(f))
  .flatMap((f) => [...strip(readFileSync(f, 'utf8')).matchAll(/export (?:function|const) ([A-Z]\w*[a-z]\w*)/g)].map((m) => ({ name: m[1] ?? '', file: f })));
const readme = readFileSync(join(__dirname, 'README.md'), 'utf8');
/** Named as code: `Name`, `Name(...)` or `folder/Name...`, so a word in prose ("Sidebar") does not count. */
const named = (n: string): boolean => new RegExp(`\`(?:[\\w-]+/)*${n}\\b`).test(readme);

describe('src/components/README.md names the shared components on disk', () => {
  it('finds the shared components (the walk is not empty)', () => {
    expect(exported.length).toBeGreaterThan(60);
  });
  it('names every exported shared component, or exempts it with a reason', () => {
    const missing = exported.filter(({ name }) => !named(name) && !Object.hasOwn(EXEMPT, name));
    expect(missing.map(({ name, file }) => `${name} (${rel(file)})`)).toEqual([]);
  });
  it('keeps no stale exemption: each is still exported and still not named', () => {
    const names = new Set(exported.map((e) => e.name));
    expect(Object.keys(EXEMPT).filter((n) => !names.has(n) || named(n))).toEqual([]);
  });
  it('names no component that is not on disk', () => {
    const names = new Set(exported.map((e) => e.name));
    // A path under app/ (`app/Providers`) names a module of the app, not a shared component.
    const cited = [...readme.matchAll(/`((?:[\w-]+\/)*)([A-Z][a-z]\w*)(?=[`({<])/g)].filter((m) => !(m[1] ?? '').startsWith('app/')).map((m) => m[2] ?? '');
    expect([...new Set(cited)].filter((n) => !names.has(n))).toEqual([]);
  });
});
