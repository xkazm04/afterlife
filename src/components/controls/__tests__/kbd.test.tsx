// A modifier keycap must carry a spoken name: the glyph is aria-hidden and a visually-hidden word says it.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Kbd } from '../Kbd';

const KEYS = ['⌘', '⌥', '⇧', '⌃', '⌘I', '⌘⇧P'];
const html = (k: string) => renderToStaticMarkup(createElement(Kbd, null, k));
/** Modifier keycaps whose glyph is not hidden from assistive tech or has no hidden spoken text beside it. */
const unnamed = (keys: readonly string[]) => keys.filter((k) => !/aria-hidden="true"[^>]*>[^<]*<\/span><span class="sr-only">[^<]+</.test(html(k)));

describe('Kbd modifier names', () => {
  it('leaves no modifier keycap without an accessible name', () => {
    expect(unnamed(KEYS)).toEqual([]);
  });
  it('speaks Command I for ⌘I', () => {
    expect(html('⌘I')).toContain('>Command I<');
  });
  it('leaves plain keycaps untouched', () => {
    expect(html('Esc')).not.toContain('sr-only');
  });
});
