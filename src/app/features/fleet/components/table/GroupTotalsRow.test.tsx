// The group row's proofs cell, like a project row's: unknown proofs are a "?", never a zero.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { makeProject } from '../../model/testProject';
import type { FleetMeta } from '../../model/types';
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
