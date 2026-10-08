import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO, DEMO_CYCLES } from '@/lib/demo';
import { Answer } from './components/answer/Answer';
import { ChangesTable } from './components/changes/ChangesTable';
import { CycleGrid } from './components/grid/CycleGrid';
import { CyclesInspector } from './components/inspector/CyclesInspector';
import { LoopRail } from './components/rail/LoopRail';
import { buildCycles } from './model/build';
import { gridView } from './model/grid';
const { cycles: CLOSED_CYCLES, today: TODAY, cadence: CADENCE_DAYS } = DEMO_CYCLES;

const data = buildCycles(DEMO.maturity, CLOSED_CYCLES, { project: 'acme-lab/ledgerline', today: TODAY, cadence: CADENCE_DAYS });
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe('Cycles parts render for every cycle', () => {
  for (const cycle of data.cycles) {
    it(`${cycle.id} (${cycle.state})`, () => {
      const out = [
        html(createElement(LoopRail, { cycle })),
        html(createElement(ChangesTable, { cycle })),
        html(createElement(CyclesInspector, { cycle, data, designed: false, onDesign: () => {}, onReport: () => {} })),
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
  it('a closed cycle never ticks a check its own changes failed', () => {
    const c5 = data.cycles.find((c) => c.id === 'C5')!;
    const out = html(createElement(CyclesInspector, { cycle: c5, data, designed: false, onDesign: () => {}, onReport: () => {} }));
    expect(out).toMatch(/data-failed="true"[^>]*><span aria-hidden="true">✗<\/span><span><b>Not detector-only/);
    expect(out).toContain('1 change stopped');
    const c6 = data.cycles.find((c) => c.id === 'C6')!;
    expect(html(createElement(CyclesInspector, { cycle: c6, data, designed: false, onDesign: () => {}, onReport: () => {} }))).not.toContain('✗');
  });
  it('the trajectory survives an all-zero history', () => {
    const flat = gridView(Object.fromEntries(Object.keys(data.day0).map((k) => [k, 0])) as typeof data.day0, []);
    expect(html(createElement(CycleGrid, { view: flat, selected: '', onSelect: () => {} }))).not.toContain('NaN');
  });
  it('the answer band states both proofs', () => {
    const out = html(createElement(Answer, { data }));
    expect(out).toContain('replay = 14:02 scan');
    expect(out).toContain('chain holds');
  });
  it('the running cycle sends you to Maturity, and only the running one is amber', () => {
    const running = data.cycles.find((c) => c.state === 'running')!;
    expect(html(createElement(CyclesInspector, { cycle: running, data, designed: false, onDesign: () => {}, onReport: () => {} }))).toContain('Send in Maturity');
    expect(html(createElement(LoopRail, { cycle: running }))).toContain('data-you="true"');
    expect(html(createElement(LoopRail, { cycle: data.cycles[0]! }))).not.toContain('data-you');
  });
});

describe('a project whose ledger records no closed cycle yet', () => {
  const fresh = buildCycles(DEMO.maturity, [], { project: 'acme-lab/ledgerline', today: 0, cadence: 7 });
  it('opens C1 at day 0, and calls every stage the scan moved since day 0 drift, not credit', () => {
    expect(fresh.cycles.map((c) => [c.id, c.state])).toEqual([['C1', 'running'], ['C2', 'planned']]);
    expect(fresh.drift.length).toBeGreaterThan(0);
  });
  it('renders the running cycle, its grid and the inspector', () => {
    const c1 = fresh.cycles[0]!;
    const out = html(createElement(CyclesInspector, { cycle: c1, data: fresh, designed: false, onDesign: () => {}, onReport: () => {} }));
    expect(out).toContain('C1');
    expect(html(createElement(CycleGrid, { view: gridView(fresh.day0, fresh.cycles), selected: 'C1', onSelect: () => {} })).match(/role="columnheader"/g)).toHaveLength(4);
  });
});
