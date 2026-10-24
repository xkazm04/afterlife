import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// The kit says "every shared component in every state". The list of components is src/components on disk, not a hand
// list: every exported component (a PascalCase function or const in a .tsx file) must be named in the kit's code
// (comments stripped, so prose does not count), or be one of the exemptions below, each with its reason.
const SRC = resolve(__dirname, '../../..');
const COMPONENTS = join(SRC, 'components');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const rel = (f: string): string => relative(COMPONENTS, f).split(sep).join('/');
const named = (code: string, n: string): boolean => new RegExp(`\\b${n}\\b`).test(code);

/** Drawn by Window itself, which /kit renders: the kit shows them by showing the window. */
const BY_WINDOW = ['Backdrop', 'Toolbar', 'Inspector', 'StatusBar', 'Sidebar', 'AppNav', 'NavLink', 'SettingsNav', 'TrafficLights'];
const EXEMPT: Record<string, string> = {
  ...Object.fromEntries(BY_WINDOW.map((n) => [n, 'drawn by Window, which /kit renders'])),
  CommandPalette: 'mounted once by app/Providers on every route, /kit included (Cmd/Ctrl+K)',
  ShellProvider: 'a context provider: it draws nothing',
};

const exported = walk(COMPONENTS)
  .filter((f) => f.endsWith('.tsx') && !/\.test\.tsx$/.test(f))
  .flatMap((f) => [...strip(readFileSync(f, 'utf8')).matchAll(/export (?:function|const) ([A-Z]\w*[a-z]\w*)/g)].map((m) => ({ name: m[1] ?? '', file: f })));
const kit = walk(__dirname)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => strip(readFileSync(f, 'utf8')))
  .join('\n');

/** Every src/components file a module reaches through relative or @/components imports. */
function closure(start: string): Set<string> {
  const seen = new Set<string>();
  const visit = (f: string) => {
    if (seen.has(f)) return;
    seen.add(f);
    for (const m of strip(readFileSync(f, 'utf8')).matchAll(/from '((?:\.\.?\/|@\/components\/)[^']+)'/g)) {
      const spec = m[1] ?? '';
      const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : resolve(dirname(f), spec);
      const hit = ['.tsx', '.ts'].map((x) => base + x).find((p) => existsSync(p));
      if (hit) visit(hit);
    }
  };
  visit(start);
  return seen;
}

describe('kit specimen coverage, from src/components on disk', () => {
  it('finds the shared components (the walk is not empty)', () => {
    expect(exported.length).toBeGreaterThan(60);
  });
  it('names every exported shared component somewhere in the kit, or exempts it with a reason', () => {
    const missing = exported.filter(({ name }) => !named(kit, name) && !Object.hasOwn(EXEMPT, name));
    expect(missing.map(({ name, file }) => `${name} (${rel(file)})`)).toEqual([]);
  });
  it('keeps no stale exemption: each is still exported and still not named by the kit', () => {
    const names = new Set(exported.map((e) => e.name));
    expect(Object.keys(EXEMPT).filter((n) => !names.has(n) || named(kit, n))).toEqual([]);
  });
  it('exempts as "drawn by Window" only what Window really reaches', () => {
    const reach = closure(join(COMPONENTS, 'shell/Window.tsx'));
    const fileOf = (n: string) => exported.find((e) => e.name === n)?.file ?? '';
    expect(BY_WINDOW.filter((n) => !reach.has(fileOf(n)))).toEqual([]);
  });
});
