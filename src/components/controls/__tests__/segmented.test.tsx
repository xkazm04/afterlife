// A radiogroup with roving tabindex must always expose exactly one tab stop; with a value that matches no option
// (a stale URL state, a filter that was cleared) every segment used to be tabindex -1 and the group was unreachable.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SegmentedControl } from '../toolbar/SegmentedControl';

const OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
] as const;
const render = (value: string) =>
  renderToStaticMarkup(createElement(SegmentedControl<string>, { options: OPTIONS, value, onChange: () => {}, label: 'Pick' }));
const stops = (html: string) => (html.match(/tabindex="0"/g) ?? []).length;

describe('SegmentedControl tab stop', () => {
  it('is the selected segment when the value matches an option', () => {
    const html = render('b');
    expect(stops(html)).toBe(1);
    expect(html).toMatch(/aria-checked="true" tabindex="0"[^>]*>B</);
  });

  it('falls back to the first segment when the value matches no option', () => {
    const html = render('gone');
    expect(stops(html)).toBe(1);
    expect(html).toMatch(/aria-checked="false" tabindex="0"[^>]*>A</);
  });
});
