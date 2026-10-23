import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// tokens.css states that colour literals live only in that file. The fallback pages once repeated a different palette as
// var() fallbacks (--bg #0b0f14 against the token's #030405); global-error imports globals.css, so tokens are always there.
const css = readFileSync(join(process.cwd(), 'src/components/shell/fallback/Fallback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklab|oklch)\(/g;

describe('Fallback.module.css', () => {
  it('carries no colour literal; every colour comes from a token', () => {
    expect(css.match(LITERAL) ?? []).toEqual([]);
  });
  it('still reads its colours from tokens', () => {
    expect(css).toContain('var(--bg)');
    expect(css).toContain('var(--text-1)');
  });
});

// text-size.css sets the sizes on :root as well as on html[data-text-size], and global-error imports globals.css, so a
// bare <html> has them: a var() fallback here is a second type scale (14/12 against 15/13) that can never show.
describe('Fallback.module.css type', () => {
  it('reads its sizes and font stacks from the tokens, with no fallback scale of its own', () => {
    expect(css.match(/var\(--t-[\w-]+\s*,/g) ?? []).toEqual([]);
    expect(css).not.toMatch(/system-ui|ui-monospace/);
    expect(css).toContain('var(--sys)');
    expect(css).toContain('var(--mono)');
  });
});
