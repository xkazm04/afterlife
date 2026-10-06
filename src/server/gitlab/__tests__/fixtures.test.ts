// Fixtures are honest about where they came from, and carry no secrets.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '__fixtures__');

function jsonFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? jsonFiles(p) : n.endsWith('.json') ? [p] : [];
  });
}

const files = jsonFiles(ROOT);

describe('fixtures', () => {
  it('finds both the recorded and the hand-written ones', () => {
    expect(files.length).toBeGreaterThanOrEqual(14);
  });

  it.each(files.map((f) => [f.slice(ROOT.length + 1).replaceAll('\\', '/'), f]))('%s declares its _shape', (name, path) => {
    const fx = JSON.parse(readFileSync(path, 'utf8')) as { _shape?: string };
    expect(typeof fx._shape).toBe('string');
    if (name.startsWith('live/')) expect(fx._shape).toMatch(/^recorded live 2026-10-06/);
    else expect(fx._shape).toMatch(/^\[R\] from docs/);
  });

  it('holds no token, email or credential field', () => {
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      expect(text, f).not.toMatch(/runners_token|"email"|glpat-|"private_token"|"identities"|Bearer /);
    }
  });
});
