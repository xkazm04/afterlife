// A project row's honesty rules, pinned: unknown is never drawn as a count, pips stop at 8, the standings sit beside the
// Quarantined count (not in it), and an unwatched row shows no needs-you, proofs or stage cells.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import type { FleetProject } from '@/lib/demo/types';
import { makeProject } from '../../model/testProject';
import type { FleetMeta, FleetView } from '../../model/types';
import { ProjectRow } from './ProjectRow';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const noop = () => undefined;
const h = { onSelect: noop, onActivate: noop, onContextMenu: noop, onToggleGroup: noop, onGroupContextMenu: noop, onTierEnter: noop, onTierLeave: noop };
const meta: FleetMeta = { classes: ['a', 'b'], stages: ['s0', 's1'], tiers: DEMO.tiers };
const row = (p: FleetProject, over: { view?: FleetView; narrow?: boolean } = {}) =>
  renderToStaticMarkup(createElement(ProjectRow, { p, view: over.view ?? 'tiers', ranked: null, narrow: over.narrow ?? false, meta, selected: false, alt: false, grouped: true, h }));
const pips = (html: string) => (html.match(/<i><\/i>/g) ?? []).length;

describe('ProjectRow tier cells', () => {
  it('draws no count at all when the tiers are unknown', () => {
    const out = row(makeProject({ id: 'a', classTiers: {} }));
    expect(out).toContain('Tiers unknown for this project');
    expect(out).not.toContain('_n_');
    expect(row(makeProject({ id: 'a' }))).toContain('_n_');
  });

  it('caps the pips at 8 however many classes sit at the tier', () => {
    const out = row(makeProject({ id: 'a', tiers: { hands_off: 12, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 } }));
    expect(out).toContain('>12<');
    expect(pips(out)).toBe(8);
  });

  it('drops the pips in a narrow pane', () => {
    expect(pips(row(makeProject({ id: 'a' }), { narrow: true }))).toBe(0);
  });

  it('sets a no-record class apart beside the Quarantined count, never in it', () => {
    const out = row(makeProject({ id: 'a', tiers: { hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 }, classTiers: { x: 'no_record' } }));
    expect(out).toContain('1 class: no record yet (not quarantined)');
    expect(out).toContain('>0<');
  });
});

describe('ProjectRow class cells', () => {
  it('names a class with no tier unknown, as the project page does, instead of an untitled blank', () => {
    const out = row(makeProject({ id: 'a', classTiers: { a: 'hands_off' } }), { view: 'classes' });
    expect(out).toContain('title="a: Hands-off"');
    expect(out).toContain('title="b: unknown"');
  });
});

describe('ProjectRow stage cells', () => {
  const cells = (html: string) => (html.match(/role="gridcell"/g) ?? []).length;

  it('draws one cell per stage the header draws, whatever the length of the rung list', () => {
    const base = cells(row(makeProject({ id: 'a', stages: [1, 1] }), { view: 'stages' }));
    expect(cells(row(makeProject({ id: 'a', stages: [1, 1, 1, 1, 1, 1, 1, 1, 1] }), { view: 'stages' }))).toBe(base);
    expect(cells(row(makeProject({ id: 'a', stages: [1] }), { view: 'stages' }))).toBe(base);
  });

  it('a stage the rung list does not reach is unknown, not missing', () => {
    expect(row(makeProject({ id: 'a', stages: [] }), { view: 'stages' })).not.toContain('>1<');
  });
});

describe('ProjectRow unwatched', () => {
  const unwatched = makeProject({ id: 'a', state: 'not-set-up', needsYou: 3, classTiers: {} });

  it('shows no decisions count, no proofs and no stage cells', () => {
    const out = row(unwatched);
    expect(out).not.toContain('Last 7 days');
    expect(out).not.toContain('>3<');
    expect(row(makeProject({ id: 'a', needsYou: 3 }))).toContain('>3<');
    expect(row(makeProject({ id: 'a' }))).toContain('Last 7 days');
  });

  it('shows no stage rung in the Stages view', () => {
    expect(row(unwatched, { view: 'stages' })).not.toContain('>1<');
    expect(row(makeProject({ id: 'a' }), { view: 'stages' })).toContain('>1<');
  });
});
