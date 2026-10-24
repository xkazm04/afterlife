import { describe, expect, it } from 'vitest';
import { TOUR, tourNote } from '../callouts/tour';
import { shownLayout, type Layout } from './useParts';

const fleet = TOUR[0]!;
const measured: Layout = {
  area: { x: 0, y: 0, w: 800, h: 600 },
  parts: [{ n: 1, callout: fleet.callouts[0]!, box: { x: 10, y: 10, w: 100, h: 40 } }],
  card: { x: 200, y: 10, w: 330, h: 150 },
  line: { x1: 200, y1: 85, x2: 110, y2: 30 },
  text: 'words',
};

describe('X-ray layout shown', () => {
  it('draws the measured parts on a labelled screen', () => {
    expect(shownLayout(measured, true, fleet.callouts.length)).toBe(measured);
  });
  it('draws no badge or card on a screen it does not label, though the last screen’s layout is kept', () => {
    const shown = shownLayout(measured, true, 0);
    expect(shown.parts).toEqual([]);
    expect(shown.card).toBeNull();
    expect(shown.line).toBeNull();
  });
  it('draws nothing while off', () => {
    expect(shownLayout(measured, false, fleet.callouts.length).parts).toEqual([]);
  });
});

describe('X-ray unlabelled note', () => {
  it('names every tour screen, counted from the tour', () => {
    const note = tourNote();
    expect(note).toContain(`labels ${TOUR.length} screens`);
    for (const s of TOUR) expect(note).toContain(s.label);
  });
  it('reads as a list for one and two screens', () => {
    expect(tourNote([fleet])).toBe(`The X-ray labels one screen: ${fleet.label}.`);
    expect(tourNote(TOUR.slice(0, 2))).toBe(`The X-ray labels 2 screens: ${TOUR[0]!.label} and ${TOUR[1]!.label}.`);
  });
});
