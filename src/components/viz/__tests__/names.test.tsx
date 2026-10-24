// The drawn glyphs carry their meaning only through role="img" + aria-label (b964f72 added the names with no test).
// Pin the spoken text for every state, including the three "unknown is never zero" boxes.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DayStrip } from '../DayStrip';
import { ProofBar } from '../ProofBar';
import { RungGlyph } from '../RungGlyph';
import { StageMeter } from '../StageMeter';
import { StageTicks } from '../StageTicks';
import { TrendDelta } from '../trend/TrendDelta';
import { TrendStrip } from '../trend/TrendStrip';

const name = (html: string): string => /role="img" aria-label="([^"]*)"/.exec(html)?.[1] ?? '';

const CASES: Array<[string, ReactElement, string]> = [
  ['DayStrip clean', createElement(DayStrip, { clean: 6 }), '6 of the last 14 days clean'],
  ['DayStrip window', createElement(DayStrip, { clean: 3, days: 7 }), '3 of the last 7 days clean'],
  // the poller's cleanDays counts every day since the record's window began, so it can exceed the strip's 14 cells
  ['DayStrip longer run', createElement(DayStrip, { clean: 30 }), '14 of the last 14 days clean (30 in a row)'],
  // the red newest cell is drawn only when no day is clean (dayCells): the name says so in exactly that case
  ['DayStrip reverted today', createElement(DayStrip, { clean: 0, revertedToday: true }), '0 of the last 14 days clean, reverted today'],
  ['DayStrip reverted, clean days', createElement(DayStrip, { clean: 2, revertedToday: true }), '2 of the last 14 days clean'],
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
  ['TrendDelta rise', createElement(TrendDelta, { value: 2, label: 'waiting' }), 'waiting +2 since last week'],
  ['TrendStrip young', createElement(TrendStrip, { values: [1, null, 3], label: 'waiting' }), 'waiting over 3 days: 1 to 3, now 3'],
];

describe('viz glyph accessible names', () => {
  it.each(CASES)('%s', (_n, el, spoken) => {
    expect(name(renderToStaticMarkup(el))).toBe(spoken);
  });
});

// RungGlyph's "≤ S" caption repeats the ceiling its image already names ("ceiling Supervised"): hidden, not spoken twice.
describe('RungGlyph caption', () => {
  it('is aria-hidden beside the named glyph', () => {
    const html = renderToStaticMarkup(createElement(RungGlyph, { tier: 'assisted', ceiling: 'supervised' }));
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>≤ S<\/span>/);
  });
});

// CASES is a hand list: derive what it must cover from the folder (trend/ included), so a new self-naming glyph cannot skip it.
describe('the name pins cover every viz component that names itself', () => {
  const dir = join(__dirname, '..');
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.tsx') && !f.includes('__tests__') && !f.endsWith('.test.tsx'));
  const naming = files.filter((f) => readFileSync(join(dir, f), 'utf8').includes('aria-label')).map((f) => basename(f, '.tsx'));
  it.each(naming)('%s has a case', (component) => {
    expect(CASES.some(([n]) => n.split(' ')[0] === component)).toBe(true);
  });
  it('control: the folder scan reaches the nested trend glyphs', () => {
    expect(naming).toEqual(expect.arrayContaining(['DayStrip', 'StageMeter', 'TrendDelta', 'TrendStrip']));
  });
});
