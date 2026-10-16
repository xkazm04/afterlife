// The file header counts what the lines carry: the "+" and the "-" lines, not a literal zero.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DiffFile } from '../../../data/types';
import { DiffView } from './DiffView';

const header = (f: DiffFile): string => {
  const html = renderToStaticMarkup(createElement(DiffView, { files: [f], index: 0, onTab: () => {} }));
  const m = /<span class="[^"]*aux[^"]*">(.*?)<\/span>/.exec(html);
  if (!m) throw new Error(`no header in: ${html.slice(0, 300)}`);
  return m[1] ?? '';
};

describe('DiffView header', () => {
  it('counts one removed line beside one added line', () => {
    expect(header({ path: 'a.yml', isNew: false, lines: ['-old', '+new'] })).toBe('+1 −1');
  });
  it('keeps -0 for a file with no removals, and marks a new file', () => {
    expect(header({ path: 'b.yml', isNew: true, lines: ['+a', '+b', '+c'] })).toBe('new · +3 −0');
  });
});
