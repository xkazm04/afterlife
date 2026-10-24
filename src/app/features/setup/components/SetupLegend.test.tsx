import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ArmStatus, StepStatus } from '../model/types';
import type { DepTone } from './shared/DepRow';
import { DEP_ROWS, STEP_ROWS, TRACK_ROWS } from './legendRows';
import { SetupLegend } from './SetupLegend';

// Records, so adding a state to a union is a type error here until the legend is told.
const ARM: Record<ArmStatus, true> = { locked: true, ready: true, open: true, armed: true, probing: true, undefined: true, unknown: true };
const STEP: Record<StepStatus, true> = { todo: true, human: true, done: true, probing: true, failed: true, unknown: true };

function owners<S extends string>(all: Record<S, true>, rows: readonly { covers: readonly S[] }[]) {
  return (Object.keys(all) as S[]).map((st) => [st, rows.filter((r) => r.covers.includes(st)).length] as const);
}

describe('SetupLegend rows', () => {
  it('gives every track state exactly one row', () => {
    expect(owners(ARM, TRACK_ROWS).filter(([, n]) => n !== 1)).toEqual([]);
  });
  it('gives every step state exactly one row', () => {
    expect(owners(STEP, STEP_ROWS).filter(([, n]) => n !== 1)).toEqual([]);
  });
  it('renders each row text', () => {
    const html = renderToStaticMarkup(<SetupLegend />);
    for (const r of [...TRACK_ROWS, ...STEP_ROWS]) expect(html).toContain(r.text.replace(/·/g, '·'));
  });

  const TONES: Record<DepTone, true> = { none: true, met: true, you: true, unknown: true, no: true, ready: true };

  it('page legend explains every dep-row tone and none of the map-only elements', () => {
    expect(owners(TONES as Record<string, true>, DEP_ROWS.map((r) => ({ covers: [r.tone] as string[] }))).filter(([, n]) => n !== 1)).toEqual([]);
    const page = renderToStaticMarkup(<SetupLegend where="page" />);
    for (const r of DEP_ROWS) expect(page).toContain(r.text);
    for (const gone of ['Waits on a gate', 'Track needs track', 'Unknown capability', 'Tab walks the map', 'Locked']) expect(page).not.toContain(gone);
    expect(renderToStaticMarkup(<SetupLegend />)).toContain('Tab walks the map');
  });
  it('says what lights an edge as the map does it: a hover or the lozenge, never a pick (a pick opens the page)', () => {
    const map = renderToStaticMarkup(<SetupLegend />);
    expect(map).not.toMatch(/pick/);
    expect(map).toContain('lit on hover or by the doctor lozenge');
    expect(map).toContain('Capability edges are illustrative, drawn in demo mode only');
  });
});
