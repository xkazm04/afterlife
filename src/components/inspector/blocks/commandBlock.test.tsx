import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommandBlock } from '../CommandBlock';

// Lives in blocks/: inspector/ is at the 10-file folder limit. The "$ " is decoration, not part of the command.
const css = readFileSync(new URL('../CommandBlock.module.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('CommandBlock prompt', () => {
  it('is left out of a text selection, so a copied command pastes into a shell as it runs', () => {
    const rule = /\.prompt\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/(^|;|\s)user-select:\s*none/);
  });
  it('is hidden from assistive tech, which would read "dollar" before every command', () => {
    const html = renderToStaticMarkup(<CommandBlock commands={['git pull --ff-only']} />);
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>\$ <\/span>git pull --ff-only/);
  });
  it('still draws no prompt with prompt={false}', () => {
    expect(renderToStaticMarkup(<CommandBlock commands={['x']} prompt={false} />)).not.toContain('$ ');
  });
});
