// Every class a Ladder CSS module defines is read by a component that imports that module. A class nothing reads is a
// leftover of a view that moved (the track inspector became the class page); it ships in the bundle and misleads the next
// reader. Classes picked by a template (styles[`k-${kind}`]) are covered by their prefix; a bare styles[expr] is not a
// reference to any name, so the classes it picks are listed here with where the picking happens.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const LADDER = path.resolve(__dirname, '..');
const PICKED_BY_EXPRESSION: Readonly<Record<string, readonly string[]>> = {
  // components/inspector/log/Axis.tsx: styles[p.edge], p.edge from model/view/timeline.ts
  'log.module.css': ['first', 'last'],
};

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const stripCss = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJs = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The class names a stylesheet defines, in selector position (not inside a value such as 0.45 or a url). */
export function definedClasses(css: string): string[] {
  const heads = stripCss(css).replace(/\{[^{}]*\}/g, '{}').replace(/\{\}/g, ',');
  return [...new Set([...heads.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]!))];
}

/** Whether `source` reads class `name` off the module it imports from `base` (ident.name, ident['name'], or a template prefix). */
export function reads(source: string, name: string, base: string): boolean {
  const src = stripJs(source);
  const ident = src.match(new RegExp(`import (\\w+) from '[^']*${base.replace(/\./g, '\\.')}'`))?.[1];
  if (!ident) return false;
  if (/^\w+$/.test(name) && new RegExp(`\\b${ident}\\.${name}\\b`).test(src)) return true;
  if (src.includes(`${ident}['${name}']`) || src.includes(`${ident}["${name}"]`)) return true;
  return [...src.matchAll(new RegExp(`\\b${ident}\\[\`([\\w-]*)\\$\\{`, 'g'))].some((m) => m[1] !== '' && name.startsWith(m[1]!));
}

const files = walk(LADDER);
const sheets = files.filter((f) => f.endsWith('.module.css'));
const sources = files.filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

describe('the Ladder CSS modules', () => {
  it('there are modules to check', () => {
    expect(sheets.length).toBeGreaterThanOrEqual(8);
  });
  it.each(sheets.map((s) => [path.relative(LADDER, s).replace(/\\/g, '/'), s]))('%s: every class is read by an importer', (_rel, sheet) => {
    const base = path.basename(sheet);
    const importers = sources.map((f) => readFileSync(f, 'utf8')).filter((t) => new RegExp(`from '[^']*${base.replace(/\./g, '\\.')}'`).test(t));
    const exempt = PICKED_BY_EXPRESSION[base] ?? [];
    const dead = definedClasses(readFileSync(sheet, 'utf8')).filter((c) => !exempt.includes(c) && !importers.some((t) => reads(t, c, base)));
    expect(dead).toEqual([]);
  });
  it('the matcher sees a dead class (seeded control)', () => {
    const css = '.live { color: red; }\n.dead { margin: 0.45em; }\n.k-a { x: 1; }';
    const tsx = "import s from './x.module.css';\n// s.dead is gone\n<i className={`${s.live} ${s[`k-${kind}`]}`} />";
    expect(definedClasses(css)).toEqual(['live', 'dead', 'k-a']);
    expect(definedClasses(css).filter((c) => !reads(tsx, c, 'x.module.css'))).toEqual(['dead']);
  });
});
