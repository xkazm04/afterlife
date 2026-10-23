import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Every windowed screen names its tab: a page.tsx exports `metadata` or `generateMetadata`. The two exceptions have none to give:
// the front door is not a windowed screen (it titles itself from the root layout) and /settings only redirects to its first sub-page.
const EXEMPT = new Set(['(door)/page.tsx', 'settings/page.tsx']);

function pages(dir: string, rel = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const next = path.posix.join(rel, e.name);
    if (e.isDirectory()) return e.name === 'features' || e.name === 'api' ? [] : pages(path.join(dir, e.name), next);
    return e.name === 'page.tsx' ? [next] : [];
  });
}

describe('page titles', () => {
  const root = path.join(import.meta.dirname);
  const all = pages(root);

  it('finds the route pages', () => {
    expect(all.length).toBeGreaterThan(15);
  });

  it.each(all.filter((p) => !EXEMPT.has(p)))('%s exports a title', (page) => {
    expect(readFileSync(path.join(root, page), 'utf8')).toMatch(/export (const metadata|async function generateMetadata|function generateMetadata)/);
  });
});
