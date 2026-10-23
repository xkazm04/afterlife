// The legend's key line is read from the screen's keymap (model/keys/keymap.ts), so a key the screen binds is a key the
// legend names: ↑ ↓ move between stages too, and the line once said only ←→.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { capsOf } from '@/lib/keyboard/keymap';
import { MATURITY_KEYMAP } from '../../model/keys/keymap';
import { MaturityLegend } from './MaturityLegend';

const keysLine = (): string => {
  const m = /<div class="[^"]*keys[^"]*">(.*?)<\/div>/.exec(renderToStaticMarkup(createElement(MaturityLegend)));
  if (!m) throw new Error('no keys line');
  return m[1] ?? '';
};

describe('MaturityLegend key line', () => {
  it('names every key the Maturity keymap binds', () => {
    const line = keysLine().toLowerCase();
    const caps = MATURITY_KEYMAP.entries.flatMap((e) => capsOf(e.keys));
    expect(caps.filter((c) => !line.includes(c.toLowerCase()))).toEqual([]);
  });
});
