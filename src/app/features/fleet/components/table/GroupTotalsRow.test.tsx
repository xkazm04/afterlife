// The group row's proofs cell, like a project row's: unknown proofs are a "?", never a zero.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { makeProject } from '../../model/testProject';
import type { FleetEstate, FleetMeta } from '../../model/types';
import { GroupTotalsRow, type GroupTotalsRowProps } from './GroupTotalsRow';

const meta: FleetMeta = { classes: ['a'], stages: ['s'], tiers: {} as FleetMeta['tiers'] };
const noop = () => undefined;
const h = { onSelect: noop, onActivate: noop, onContextMenu: noop, onToggleGroup: noop, onGroupContextMenu: noop, onTierEnter: noop, onTierLeave: noop };
const render = (list: GroupTotalsRowProps['list']) =>
  renderToStaticMarkup(createElement(GroupTotalsRow, { group: 'core', list, view: 'tiers', ranked: null, meta, expanded: true, selected: false, h }));
const proofsCell = (html: string) => html.slice(html.indexOf('_pc_'));

describe('GroupTotalsRow proofs', () => {
  it('sums the known proofs of its projects', () => {
    const out = proofsCell(render([makeProject({ id: 'a', proofs7d: { pass: 3, fail: 1, inconclusive: 0 } }), makeProject({ id: 'b', proofs7d: { pass: 2, fail: 0, inconclusive: 0 } })]));
    expect(out).toContain('>5<');
    expect(out).toContain('5 pass · 1 fail');
  });

  it('sums over the known ones when only some projects know theirs', () => {
    const out = proofsCell(render([makeProject({ id: 'a', proofs7d: null }), makeProject({ id: 'b', proofs7d: { pass: 2, fail: 0, inconclusive: 0 } })]));
    expect(out).toContain('2 pass');
  });

  it('draws unknown, not zero, when no project in the group knows its proofs', () => {
    const out = proofsCell(render([makeProject({ id: 'a', proofs7d: null }), makeProject({ id: 'b', proofs7d: null })]));
    expect(out).toContain('>?<');
    expect(out).toContain('Proofs unknown');
    expect(out).not.toContain('No proofs yet');
  });
});

describe('GroupTotalsRow agent spend', () => {
  const list = [makeProject({ id: 'a' }), makeProject({ id: 'b' }), makeProject({ id: 'c' })];
  const spend = (estate: GroupTotalsRowProps['estate']) =>
    renderToStaticMarkup(createElement(GroupTotalsRow, { group: 'core', list, view: 'tiers', ranked: null, meta, expanded: true, selected: false, h, estate })).slice(-400);
  it('sums the metered projects and says how many of the group are metered', () => {
    const out = spend({ cost: { byProject: { a: { costUsd: 2, waves: 1, repos: ['a'] }, b: { costUsd: 0.5, waves: 1, repos: ['b'] } }, unmatched: [] }, stability: null });
    expect(out).toContain('>$2.50<');
    expect(out).toContain('2 of 3 projects metered');
  });
  it('none metered is a dash, never $0; not read is an empty cell', () => {
    const none = spend({ cost: { byProject: { a: { costUsd: null, waves: 0, repos: ['a'] } }, unmatched: [] }, stability: null });
    expect(none).toContain('>-<');
    expect(none).not.toContain('$0');
    expect(spend({ cost: null, stability: null })).not.toContain('metered');
  });
});

describe('GroupTotalsRow red pipelines', () => {
  const list = [makeProject({ id: 'a' }), makeProject({ id: 'b' }), makeProject({ id: 'c' })];
  const s = (failed: number, finals: number) => ({ n: finals, medianSize: null, redRate: finals ? failed / finals : null, failed, finals, reverts: 0 });
  const row = (stability: FleetEstate['stability']) =>
    renderToStaticMarkup(createElement(GroupTotalsRow, { group: 'core', list, view: 'tiers', ranked: null, meta, expanded: true, selected: false, h, estate: { cost: null, stability } }));
  it('sums failed over the final pipelines of the projects read, with its n', () => {
    const out = row({ a: s(1, 3), b: s(1, 1) });
    expect(out).toContain('>50% red · 4<');
    expect(out).toContain('2 of 4 final head pipelines');
  });
  it('no final pipeline is a dash, never 0%; nothing read is an empty cell', () => {
    expect(row({ a: s(0, 0) })).toContain('no agent MR in core has a final head pipeline');
    expect(row({})).not.toContain('Red pipelines');
    expect(row(null)).not.toContain('Red pipelines');
  });
});
