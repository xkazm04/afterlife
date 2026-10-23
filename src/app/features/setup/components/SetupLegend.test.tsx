import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ArmStatus, StepStatus } from '../model/types';
import { STEP_ROWS, TRACK_ROWS } from './legendRows';
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
});
