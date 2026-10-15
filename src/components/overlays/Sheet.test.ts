import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The jsdom-free tests here read the Sheet's source: this repo's vitest runs in plain node, so an effect cannot be
// mounted. Comments are stripped first so a comment that talks about the rule cannot satisfy the matcher.
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const tsx = strip(readFileSync(new URL('./Sheet.tsx', import.meta.url), 'utf8'));
const css = strip(readFileSync(new URL('./Sheet.module.css', import.meta.url), 'utf8'));

/** The dependency list of the effect that registers `needle`: the first `}, [ ... ]);` after it. */
const depsAfter = (src: string, needle: string): string | null => {
  const at = src.indexOf(needle);
  if (at < 0) return null;
  return /\},\s*\[([^\]]*)\]\s*\);/.exec(src.slice(at))?.[1]?.trim() ?? null;
};

describe('Sheet focus handling', () => {
  it('registers its Escape listener once: callers pass an inline onClose, and a re-run would re-focus the sheet and lose the opener', () => {
    expect(depsAfter(tsx, "addEventListener('keydown'")).toBe('');
  });
  it('the matcher bites: a seeded effect that depends on onClose is read as such', () => {
    const seeded = tsx.replace(/\},\s*\[\s*\]\s*\);/, '}, [onClose]);');
    expect(depsAfter(seeded, "addEventListener('keydown'")).toBe('onClose');
  });
});

describe('Sheet drop animation', () => {
  it('is switched off under prefers-reduced-motion', () => {
    const block = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\.sheet\s*\{[^}]*\})/.exec(css)?.[1] ?? '';
    expect(block).toMatch(/animation:\s*none/);
  });
});
