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
/** The body of the first at-rule that starts with `rule` (e.g. `@container toolbar (max-width: 84em)`). */
const atBlock = (sheet: string, rule: string): string => {
  const at = sheet.indexOf(rule);
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
  // The lozenge folds its words on a narrow toolbar (a size container), not on a narrow viewport.
  const narrow = atBlock(css('lozenge/Lozenge.module.css'), '@container toolbar (max-width: 84em)');
  it('hides the word from the eye, not from the accessibility tree', () => {
    expect(body(narrow, '.wd')).not.toMatch(/display:\s*none/);
    expect(body(narrow, '.wd')).toMatch(/clip-path|clip:/);
  });
});

// 3. A state fill (pressed, active, current) must survive hover: the hover rule may not out-rank it in the cascade.
/** Class/attribute/pseudo-class count of a selector; `:where(...)` adds nothing. */
const spec = (sel: string): number => (sel.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '').match(/[.[]|:(?!:)/g) ?? []).length;
/** True when the rule `state` beats the rule `hover` for a property both set: higher specificity, or equal and later. */
const outranks = (sheet: string, state: string, hover: string): boolean => {
  const at = (s: string) => sheet.indexOf(`\n${s} {`);
  expect(at(state), state).toBeGreaterThanOrEqual(0);
  expect(at(hover), hover).toBeGreaterThanOrEqual(0);
  return spec(state) > spec(hover) || (spec(state) === spec(hover) && at(state) > at(hover));
};

describe('state fills win over hover fills', () => {
  it('keeps an active PopupButton tinted on hover', () => {
    const sheet = css('toolbar/ToolbarButton.module.css');
    const active = body(sheet, '.pu.on:where(:not(:disabled))');
    expect(active).toMatch(/background/);
    expect(outranks(sheet, '.pu.on:where(:not(:disabled))', '.pu:hover:where(:not(:disabled))')).toBe(true);
  });
  it('keeps the current Stepper step raised on hover', () => {
    const sheet = css('toolbar/Stepper.module.css');
    const hover = '.step:hover:where(:not(:disabled))';
    expect(body(sheet, hover)).toMatch(/background/);
    expect(outranks(sheet, '.step[aria-current="step"]', hover)).toBe(true);
  });
});

describe('Checkbox hit target', () => {
  const sheet = css('Checkbox.module.css');
  const px = (re: RegExp, decl: string): number => Number(re.exec(decl)?.[1] ?? NaN);
  it('reaches 24px (WCAG 2.5.8) through an out-of-flow extension, the drawn box staying 14px', () => {
    const box = px(/width:\s*calc\((\d+)px/, body(sheet, '.cb'));
    const reach = px(/inset:\s*calc\(-(\d+)px/, body(sheet, '.cb::before'));
    expect(box).toBe(14);
    expect(box + 2 * reach).toBeGreaterThanOrEqual(24);
    expect(body(sheet, '.cb')).toMatch(/position:\s*relative/);
    expect(body(sheet, '.cb::before')).toMatch(/position:\s*absolute/);
  });
});
