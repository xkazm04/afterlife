// Card ids come from the data source: a quote or backslash in one must not break the attribute selector (a SyntaxError
// thrown from a layout effect takes the screen down).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardSelector } from '../hooks/useTieGeometry';

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const source = (rel: string) => strip(readFileSync(new URL(rel, import.meta.url), 'utf8'));

describe('cardSelector', () => {
  it('leaves an ordinary id untouched', () => {
    expect(cardSelector('check', 'C1')).toBe('[data-check-card="C1"]');
    expect(cardSelector('claim', 'base-red')).toBe('[data-claim-card="base-red"]');
  });
  it('escapes quotes, backslashes and newlines so the attribute string cannot be closed early', () => {
    expect(cardSelector('check', 'a"b')).toBe('[data-check-card="a\\"b"]');
    expect(cardSelector('claim', 'a\\b')).toBe('[data-claim-card="a\\\\b"]');
    expect(cardSelector('check', 'a\nb')).toBe('[data-check-card="a\\a b"]');
  });
});

describe('no raw id reaches a card selector', () => {
  it.each(['../hooks/useTieGeometry.ts', '../TaskScreen.tsx'])('%s', (rel) => {
    expect(source(rel)).not.toMatch(/data-(?:\$\{[^}]*\}|claim|check)-card="\$\{(?!escaped\})/);
  });
});
