import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// A `styles.x` with no `.x` in its CSS module is `undefined` at run time, and a template literal prints it into the DOM
// as the class "undefined". Derive the ground truth from the two files, not from a list.
const feature = path.resolve(import.meta.dirname, '..');
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const sources = [
  path.join(feature, 'TheaterScreen.tsx'),
  ...(readdirSync(import.meta.dirname, { recursive: true, encoding: 'utf8' }) as string[])
    .filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f))
    .map((f) => path.join(import.meta.dirname, f)),
];

/** Every `styles.x` a component reads that its own CSS module does not define, as "file: x". */
function missingClasses(file: string, tsx: string, css: string): string[] {
  const used = [...strip(tsx).matchAll(/\bstyles\.([A-Za-z_][\w]*)/g)].map((m) => m[1]!);
  const defined = new Set([...strip(css).matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]!));
  return [...new Set(used)].filter((c) => !defined.has(c)).map((c) => `${path.basename(file)}: ${c}`);
}

describe('every styles.x a Theater component reads exists in its CSS module', () => {
  it('scans the components it is meant to scan', () => {
    expect(sources.length).toBeGreaterThan(20);
  });
  it('has no class that would render as "undefined"', () => {
    const missing = sources.flatMap((file) => {
      const tsx = readFileSync(file, 'utf8');
      const mod = /import styles from '\.\/([\w.]+\.module\.css)'/.exec(tsx);
      if (!mod) return [];
      return missingClasses(file, tsx, readFileSync(path.join(path.dirname(file), mod[1]!), 'utf8'));
    });
    expect(missing).toEqual([]);
  });
  it('notices a class the module lacks, and ignores one that only a comment defines', () => {
    expect(missingClasses('A.tsx', 'x = styles.a + styles.b', '.a { color: red }')).toEqual(['A.tsx: b']);
    expect(missingClasses('A.tsx', 'x = styles.a', '/* .a is gone */ .b { top: 0.7px }')).toEqual(['A.tsx: a']);
  });
});
