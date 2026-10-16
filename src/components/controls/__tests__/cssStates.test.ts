// CSS-state contracts of the shared controls, read from the stylesheets (jsdom is not in play: tests run in node).
//  1. A toolbar button that can be `disabled` must look disabled and must not light up on hover. Button, Checkbox
//     and Stepper each style :disabled; ToolbarButton and PopupButton (one stylesheet) did not.
//  2. A lozenge cell's word is part of its accessible name. `display: none` drops it from the name; at the
//     breakpoints where the word is hidden it must stay readable to assistive tech (visually hidden instead).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const stripCss = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = (rel: string): string => stripCss(readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));
/** The declaration body of every rule whose selector is exactly `selector`, joined. */
const body = (sheet: string, selector: string): string => {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(sheet); m; m = re.exec(sheet)) if (m[1]!.trim() === selector) out.push(m[2]!);
  return out.join(';');
};
const mediaBlock = (sheet: string, query: string): string => {
  const at = sheet.indexOf(`@media ${query}`);
  if (at < 0) return '';
  let depth = 0;
  for (let i = sheet.indexOf('{', at); i < sheet.length; i++) {
    if (sheet[i] === '{') depth++;
    if (sheet[i] === '}' && --depth === 0) return sheet.slice(sheet.indexOf('{', at) + 1, i);
  }
  return '';
};

describe('ToolbarButton / PopupButton disabled state', () => {
  const sheet = css('toolbar/ToolbarButton.module.css');
  it('dims a disabled button', () => {
    expect(body(sheet, '.tbtn:disabled')).toMatch(/color:\s*var\(--text-4\)/);
  });
  it('does not hover-highlight a disabled button, plain or popup', () => {
    expect(body(sheet, '.tbtn:hover')).toBe('');
    expect(body(sheet, '.tbtn:hover:where(:not(:disabled))')).toMatch(/background/);
    expect(body(sheet, '.pu:hover')).toBe('');
    expect(body(sheet, '.pu:hover:where(:not(:disabled))')).toMatch(/background/);
  });
});

describe('LozengeButton word at narrow widths', () => {
  const narrow = mediaBlock(css('lozenge/Lozenge.module.css'), '(max-width: 1100px)');
  it('hides the word from the eye, not from the accessibility tree', () => {
    expect(body(narrow, '.wd')).not.toMatch(/display:\s*none/);
    expect(body(narrow, '.wd')).toMatch(/clip-path|clip:/);
  });
});
