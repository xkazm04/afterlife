import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SCREEN_KEYS } from '../data/screenKeys';
import { ScreenKeysSection } from './ScreenKeysSection';

const html = () => renderToStaticMarkup(createElement(ScreenKeysSection));

describe('ScreenKeysSection', () => {
  it('gives every row a header: no empty <th>, one rowgroup header per screen spanning its keys', () => {
    const out = html();
    expect(out).not.toMatch(/<th[^>]*><\/th>/);
    for (const s of SCREEN_KEYS) expect(out).toContain(`<th scope="rowgroup" rowSpan="${s.keys.length}">${s.screen}</th>`);
  });
  it('one row per key, with a React key unique inside its screen', () => {
    expect(html().match(/<tr>/g)?.length).toBe(SCREEN_KEYS.reduce((n, s) => n + s.keys.length, 0));
    for (const s of SCREEN_KEYS) expect(new Set(s.keys.map((k) => k.does)).size).toBe(s.keys.length);
  });
});
