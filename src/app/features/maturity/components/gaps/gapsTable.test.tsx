// The gaps table is role="table": its rowgroup may only own rows. The empty message is a row with one cell, not a bare div.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ctx } from '../../model/testCtx';
import { GapRow } from './GapRow';
import { GapsTable } from './GapsTable';

const html = renderToStaticMarkup(createElement(GapsTable, { gaps: [], picked: [], flow: {}, mrs: {}, selected: 'plan', sectionRef: null, onPick: () => {}, onSelect: () => {}, onOpen: () => {}, onAct: () => {} }));

describe('GapsTable with no gaps', () => {
  it('says so inside a row and a cell', () => {
    expect(html).toMatch(/<div[^>]*role="row"[^>]*><div[^>]*role="cell"[^>]*>No gaps proposed yet/);
  });
});

describe('GapRow tier', () => {
  it('the chip reads the proposal tier, not a literal', () => {
    const g1 = ctx.gap('g1')!;
    const gap = { ...g1, x: { ...g1.x, tier: 'supervised' as 'assisted' } };
    const noop = () => {};
    const html = renderToStaticMarkup(createElement(GapRow, { gap, picked: false, phase: undefined, mr: '', selected: false, alt: false, live: false, onPick: noop, onSelect: noop, onOpen: noop, onAct: noop }));
    expect(html).toContain('Supervised');
    expect(html).not.toContain('Assisted');
  });
});
