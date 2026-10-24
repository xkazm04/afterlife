import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anchorName } from './anchorName';

const el = (label: string | null, text: string | null) => ({ getAttribute: () => label, textContent: text });

describe('a sticky popover is named by its trigger', () => {
  it('takes the aria-label first, then the visible text', () => {
    expect(anchorName(el('Legend', '?'))).toBe('Legend');
    expect(anchorName(el(null, '  Policy\n  v3 '))).toBe('Policy v3');
    expect(anchorName(el('  ', 'Sticky'))).toBe('Sticky');
  });
  it('is undefined when the trigger has no words', () => {
    expect(anchorName(el(null, '   '))).toBeUndefined();
  });
  it('usePopover hands the name to every popover it shows', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const src = strip(readFileSync(new URL('./usePopover.tsx', import.meta.url), 'utf8'));
    expect(src).toMatch(/<Popover[^>]*\blabel=\{/);
  });
});
