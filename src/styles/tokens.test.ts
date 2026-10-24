import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// tokens.css is "copied from the design kit": the copy can carry tokens nothing draws with, and a component can name a
// token the copy never had (the property then computes to nothing and the rule silently drops). Both are read off the tree.
const SRC = join(process.cwd(), 'src');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

function walk(dir: string, out: string[] = []): string[] {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else if (/\.(css|tsx?)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC).map((p) => ({ path: relative(SRC, p).replace(/\\/g, '/'), text: strip(readFileSync(p, 'utf8')) }));
const css = files.filter((f) => f.path.endsWith('.css'));
const tokens = css.find((f) => f.path === 'styles/tokens.css')!.text;
const defined = (text: string) => [...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] as string);

describe('tokens.css', () => {
  const names = [...tokens.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1] as string);

  it('reads the tokens it is supposed to check', () => {
    expect(names.length).toBeGreaterThan(60);
    expect(names).toContain('--accent');
  });

  it('defines no token that nothing uses', () => {
    const unused = names.filter((n) => !files.some((f) => f.text.includes(`var(${n}`)));
    expect(unused).toEqual([]);
  });

  it('resolves every var() a stylesheet under src uses without a fallback', () => {
    // Defined in a stylesheet, or set by a component's inline style (`style={{ '--cols': ... }}`).
    const inline = files.filter((f) => !f.path.endsWith('.css')).flatMap((f) => [...f.text.matchAll(/['"`](--[\w-]+)['"`]\s*\]?\s*:/g)].map((m) => m[1] as string));
    const known = new Set([...css.flatMap((f) => defined(f.text)), ...inline]);
    const missing = css.flatMap((f) =>
      [...f.text.matchAll(/var\((--[\w-]+)\s*\)/g)].map((m) => m[1] as string).filter((n) => !known.has(n)).map((n) => `${f.path}: ${n}`),
    );
    expect(missing).toEqual([]);
  });
});
