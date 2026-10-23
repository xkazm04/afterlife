// The drawn glyphs carry their meaning only through role="img" + aria-label (b964f72 added the names with no test).
// Pin the spoken text for every state, including the three "unknown is never zero" boxes.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DayStrip } from '../DayStrip';
import { ProofBar } from '../ProofBar';
import { RungGlyph } from '../RungGlyph';
import { StageMeter } from '../StageMeter';
import { StageTicks } from '../StageTicks';

const name = (html: string): string => /role="img" aria-label="([^"]*)"/.exec(html)?.[1] ?? '';

describe('viz glyph accessible names', () => {
  it.each([
    ['DayStrip clean', createElement(DayStrip, { clean: 6 }), '6 of the last 14 days clean'],
    ['DayStrip window', createElement(DayStrip, { clean: 3, days: 7 }), '3 of the last 7 days clean'],
    // the poller's cleanDays counts every day since the record's window began, so it can exceed the strip's 14 cells
    ['DayStrip longer run', createElement(DayStrip, { clean: 30 }), '14 of the last 14 days clean (30 in a row)'],
    ['DayStrip unknown', createElement(DayStrip, { clean: null }), 'No record, not scored'],
    ['ProofBar mixed', createElement(ProofBar, { proofs: { pass: 5, fail: 1, inconclusive: 2 } }), '5 pass · 1 fail · 2 inconclusive'],
    ['ProofBar empty', createElement(ProofBar, { proofs: { pass: 0, fail: 0, inconclusive: 0 } }), 'No proofs yet'],
    ['ProofBar unknown', createElement(ProofBar, { proofs: null }), 'Proofs unknown'],
    ['RungGlyph tier', createElement(RungGlyph, { tier: 'assisted', ceiling: 'supervised' }), 'now Assisted · ceiling Supervised'],
    ['RungGlyph human only', createElement(RungGlyph, { tier: 'human_only', ceiling: 'human_only' }), 'Human only: no agent rung'],
    ['StageMeter rung', createElement(StageMeter, { rung: 3 }), 'Rung 3 of 4'],
    ['StageMeter zero', createElement(StageMeter, { rung: 0 }), 'Rung 0 of 4'],
    ['StageMeter unknown', createElement(StageMeter, { rung: null }), 'Rung unknown'],
    ['StageTicks labelled', createElement(StageTicks, { rungs: [1, null], labels: ['plan', 'create'] }), 'plan 1 · create ?'],
    ['StageTicks unlabelled', createElement(StageTicks, { rungs: [0, 4] }), 'stage 1 0 · stage 2 4'],
  ])('%s', (_n, el, spoken) => {
    expect(name(renderToStaticMarkup(el))).toBe(spoken);
  });
});
