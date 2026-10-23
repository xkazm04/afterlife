// A radiogroup with roving tabindex must always expose exactly one tab stop; with a value that matches no option
// (a stale URL state, a filter that was cleared) every segment used to be tabindex -1 and the group was unreachable.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SegmentedControl, nextSegment } from '../toolbar/SegmentedControl';

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

describe('nextSegment', () => {
  it('moves forward on Right and Down, back on Left and Up, wrapping', () => {
    expect(['ArrowRight', 'ArrowDown'].map((k) => nextSegment(k, 2, 3))).toEqual([0, 0]);
    expect(['ArrowLeft', 'ArrowUp'].map((k) => nextSegment(k, 0, 3))).toEqual([2, 2]);
    expect(nextSegment('ArrowDown', 0, 3)).toBe(1);
    expect(nextSegment('ArrowUp', 2, 3)).toBe(1);
  });

  it('starts at the first (forward) or last (back) segment when none is selected', () => {
    expect(nextSegment('ArrowDown', -1, 3)).toBe(0);
    expect(nextSegment('ArrowUp', -1, 3)).toBe(2);
  });

  it('ignores every other key', () => {
    expect(nextSegment('Home', 1, 3)).toBeNull();
    expect(nextSegment('a', 1, 3)).toBeNull();
  });
});
