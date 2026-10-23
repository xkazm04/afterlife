import { describe, expect, it } from 'vitest';
import { groupNavId, groupOfNavId, isTypeAhead, moveBy, navigate, revealDelta, rowDomId, type NavItem } from './rowNavigation';

const g1 = groupNavId('core');
const g2 = groupNavId('pay');
const items: NavItem[] = [
  { id: g1, kind: 'group', expanded: true },
  { id: 'a', kind: 'row', parent: g1 },
  { id: 'b', kind: 'row', parent: g1 },
  { id: g2, kind: 'group', expanded: false },
];

describe('moveBy', () => {
  it('moves and clamps at both ends', () => {
    expect(moveBy(items, 'a', 1)).toEqual({ type: 'select', id: 'b' });
    expect(moveBy(items, 'a', -5)).toEqual({ type: 'select', id: g1 });
    expect(moveBy(items, 'b', 99)).toEqual({ type: 'select', id: g2 });
  });
  it('selects the first row when nothing is selected', () => {
    expect(moveBy(items, null, 1)).toEqual({ type: 'select', id: g1 });
    expect(moveBy(items, 'gone', -1)).toEqual({ type: 'select', id: g1 });
  });
  it('End and PageDown with nothing selected go down from above the first row, not to it', () => {
    expect(moveBy(items, null, 1e6)).toEqual({ type: 'select', id: g2 });
    expect(navigate(items, null, 'End')).toEqual({ type: 'select', id: g2 });
    expect(navigate(items, 'gone', 'PageDown')).toEqual({ type: 'select', id: g2 });
    expect(navigate(items, null, 'Home')).toEqual({ type: 'select', id: g1 });
    expect(navigate(items, null, 'ArrowDown')).toEqual({ type: 'select', id: g1 });
  });
  it('does nothing on an empty table', () => {
    expect(moveBy([], null, 1)).toEqual({ type: 'none' });
  });
});

describe('navigate keys', () => {
  it('maps the movement keys', () => {
    expect(navigate(items, 'a', 'ArrowDown')).toEqual({ type: 'select', id: 'b' });
    expect(navigate(items, 'a', 'ArrowUp')).toEqual({ type: 'select', id: g1 });
    expect(navigate(items, 'a', 'Home')).toEqual({ type: 'select', id: g1 });
    expect(navigate(items, 'a', 'End')).toEqual({ type: 'select', id: g2 });
    expect(navigate(items, 'a', 'PageDown')).toEqual({ type: 'select', id: g2 });
  });
  it('ArrowLeft collapses an open group and otherwise goes to the parent', () => {
    expect(navigate(items, g1, 'ArrowLeft')).toEqual({ type: 'toggle', id: g1, open: false });
    expect(navigate(items, g2, 'ArrowLeft')).toEqual({ type: 'none' });
    expect(navigate(items, 'b', 'ArrowLeft')).toEqual({ type: 'select', id: g1 });
  });
  it('ArrowRight expands a closed group and steps into an open one', () => {
    expect(navigate(items, g2, 'ArrowRight')).toEqual({ type: 'toggle', id: g2, open: true });
    expect(navigate(items, g1, 'ArrowRight')).toEqual({ type: 'select', id: 'a' });
    expect(navigate(items, 'a', 'ArrowRight')).toEqual({ type: 'none' });
  });
  it('Enter toggles a group and activates a row', () => {
    expect(navigate(items, g1, 'Enter')).toEqual({ type: 'toggle', id: g1, open: false });
    expect(navigate(items, g2, 'Enter')).toEqual({ type: 'toggle', id: g2, open: true });
    expect(navigate(items, 'a', 'Enter')).toEqual({ type: 'activate', id: 'a' });
  });
  it('ignores other keys and a missing selection', () => {
    expect(navigate(items, 'a', 'x')).toEqual({ type: 'none' });
    expect(navigate(items, null, 'Enter')).toEqual({ type: 'none' });
  });
});

describe('helpers', () => {
  it('builds safe DOM ids', () => {
    expect(rowDomId('ledger-service')).toBe('row-ledger-service');
    expect(rowDomId('g:core banking')).toBe('row-g_3a_core_20_banking');
  });
  it('maps distinct ids to distinct DOM ids', () => {
    const ids = ['g:a', 'g-a', 'qa.bug', 'qa_bug', 'qa_2e_bug', 'a b', 'a_b', 'a-b', 'é', '_', '', '😀', 'x:y', 'x_3a_y'];
    const dom = ids.map(rowDomId);
    expect(new Set(dom).size).toBe(ids.length);
    for (const d of dom) expect(d).toMatch(/^row-[\w-]*$/);
  });
  it('detects type-ahead characters', () => {
    const base = { ctrlKey: false, metaKey: false, altKey: false };
    expect(isTypeAhead({ key: 'a', ...base })).toBe(true);
    expect(isTypeAhead({ key: '/', ...base })).toBe(false);
    expect(isTypeAhead({ key: ' ', ...base })).toBe(false);
    expect(isTypeAhead({ key: 'Enter', ...base })).toBe(false);
    expect(isTypeAhead({ key: 'a', ...base, metaKey: true })).toBe(false);
  });
});

describe('revealDelta', () => {
  // a 300px pane whose horizontal scrollbar (11px, base.css) leaves 289px of rows; 24px of sticky header on top
  const box = { rect: { top: 0, bottom: 300 }, clientTop: 0, clientHeight: 289 };
  it('scrolls up under the sticky header and leaves a visible row alone', () => {
    expect(revealDelta({ top: 10, bottom: 32 }, box, 24)).toBe(-14);
    expect(revealDelta({ top: 100, bottom: 122 }, box, 24)).toBe(0);
  });
  it('treats a row under the horizontal scrollbar as hidden', () => {
    expect(revealDelta({ top: 270, bottom: 292 }, box, 24)).toBe(5);
  });
  it('with no scrollbar the band ends at the pane edge', () => {
    expect(revealDelta({ top: 270, bottom: 292 }, { ...box, clientHeight: 300 }, 24)).toBe(0);
  });
});

describe('groupOfNavId', () => {
  it('inverts groupNavId and is null for a row id', () => {
    expect(groupOfNavId(groupNavId('core'))).toBe('core');
    expect(groupOfNavId('row-id')).toBeNull();
  });
});
