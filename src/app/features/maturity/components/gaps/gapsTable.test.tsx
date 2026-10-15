// The gaps table is role="table": its rowgroup may only own rows. The empty message is a row with one cell, not a bare div.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GapsTable } from './GapsTable';

const html = renderToStaticMarkup(createElement(GapsTable, { gaps: [], picked: [], flow: {}, mrs: {}, selected: 'plan', sectionRef: null, onPick: () => {}, onSelect: () => {}, onOpen: () => {} }));

describe('GapsTable with no gaps', () => {
  it('says so inside a row and a cell', () => {
    expect(html).toMatch(/<div[^>]*role="row"[^>]*><div[^>]*role="cell"[^>]*>No gaps proposed yet/);
  });
});
