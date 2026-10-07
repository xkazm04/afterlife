import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { Answer } from './components/answer/Answer';
import { ChangesTable } from './components/changes/ChangesTable';
import { CycleGrid } from './components/grid/CycleGrid';
import { CyclesInspector } from './components/inspector/CyclesInspector';
import { LoopRail } from './components/rail/LoopRail';
import { CADENCE_DAYS, CLOSED_CYCLES, TODAY } from './data/history';
import { buildCycles } from './model/build';
import { gridView } from './model/grid';

const data = buildCycles(DEMO.maturity, CLOSED_CYCLES, { project: 'acme-lab/ledgerline', today: TODAY, cadence: CADENCE_DAYS });
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe('Cycles parts render for every cycle', () => {
  for (const cycle of data.cycles) {
    it(`${cycle.id} (${cycle.state})`, () => {
      const out = [
        html(createElement(LoopRail, { cycle })),
        html(createElement(ChangesTable, { cycle })),
        html(createElement(CyclesInspector, { cycle, data })),
      ].join('');
      expect(out).toContain(cycle.id);
      for (const c of cycle.changes) expect(out).toContain(c.title.replace(/&/g, '&amp;'));
    });
  }
  it('the grid has a column per cycle and a row per stage', () => {
    const out = html(createElement(CycleGrid, { view: gridView(data.day0, data.cycles), selected: 'C7', onSelect: () => {} }));
    expect(out.match(/role="columnheader"/g)).toHaveLength(data.cycles.length + 2);
    expect(out.match(/role="rowheader"/g)).toHaveLength(9 + 1);
  });
  it('the answer band states both proofs', () => {
    const out = html(createElement(Answer, { data }));
    expect(out).toContain('replay = 14:02 scan');
    expect(out).toContain('chain holds');
  });
  it('the running cycle sends you to Maturity, and only the running one is amber', () => {
    const running = data.cycles.find((c) => c.state === 'running')!;
    expect(html(createElement(CyclesInspector, { cycle: running, data }))).toContain('Send in Maturity');
    expect(html(createElement(LoopRail, { cycle: running }))).toContain('data-you="true"');
    expect(html(createElement(LoopRail, { cycle: data.cycles[0]! }))).not.toContain('data-you');
  });
});
