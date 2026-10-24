// The "/" keycap is a promise that "/" focuses this field. Only a screen that passes `inputRef` can keep it (fleet,
// ladder and needs-you bind "/" to their ref); without one the hint advertises a key that does nothing.
import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SearchField } from '../toolbar/SearchField';

const render = (value: string, withRef: boolean) =>
  renderToStaticMarkup(
    createElement(SearchField, { value, onChange: () => {}, label: 'Search', inputRef: withRef ? createRef<HTMLInputElement>() : undefined }),
  );
const hint = (html: string) => /<kbd[^>]*>\/<\/kbd>/.test(html);

describe('SearchField "/" hint', () => {
  it('shows on an empty field a screen can focus with "/"', () => {
    expect(hint(render('', true))).toBe(true);
  });
  it('hides once there is text', () => {
    expect(hint(render('q', true))).toBe(false);
  });
  it('is not drawn when no screen holds the field to focus it', () => {
    expect(hint(render('', false))).toBe(false);
  });
});
