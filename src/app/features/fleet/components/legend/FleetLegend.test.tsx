// The "?" legend: the table's keys belong to the Fleet table, not to the project page that reuses the legend.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { FleetLegend } from './FleetLegend';

const render = (keys?: boolean) => renderToStaticMarkup(createElement(FleetLegend, { tiers: DEMO.tiers, keys }));

describe('FleetLegend keys line', () => {
  it('is shown on the Fleet table by default', () => {
    expect(render()).toContain('open the project page');
  });

  it('is left out where there is no table to move through', () => {
    const out = render(false);
    expect(out).not.toContain('open the project page');
    expect(out).not.toContain('right-click');
  });

  it('keeps the tier, state and proofs rows either way', () => {
    for (const out of [render(), render(false)]) {
      expect(out).toContain('Hatched = stale');
      expect(out).toContain('Proofs: pass');
    }
  });
});
