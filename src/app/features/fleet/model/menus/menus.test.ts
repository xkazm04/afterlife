import { describe, expect, it, vi } from 'vitest';
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import { makeProject } from '../testProject';
import { EMPTY_FILTERS } from '../list/filtering';
import { groupMenu, projectPath, rowMenu } from './contextMenus';
import { filterMenu, sortMenu } from './toolbarMenus';

const actions = (items: MenuEntry[]) => items.filter((e): e is Extract<MenuEntry, { label: string }> => 'label' in e);
const find = (items: MenuEntry[], label: string) => actions(items).find((e) => e.label === label);

describe('sortMenu', () => {
  const base = { sort: { key: 'attention' as const, dir: -1 as const }, grouped: true, stages: ['plan'], onSort: vi.fn(), onToggleGroups: vi.fn() };
  it('ticks the current key and disables direction for attention', () => {
    const m = sortMenu(base);
    expect(find(m, 'Attention')?.checked).toBe(true);
    expect(find(m, 'Name')?.checked).toBe(false);
    expect(find(m, 'Ascending')?.disabled).toBe(true);
    expect(find(m, 'Show Groups')?.checked).toBe(true);
  });
  it('sorts a tier column largest first and a name ascending', () => {
    const onSort = vi.fn();
    const m = sortMenu({ ...base, onSort });
    find(m, 'Quarantined')?.run();
    expect(onSort).toHaveBeenLastCalledWith({ key: 'tier:quarantined', dir: -1 });
    find(m, 'Name')?.run();
    expect(onSort).toHaveBeenLastCalledWith({ key: 'name', dir: 1 });
  });
  it('flips the direction of the current key', () => {
    const onSort = vi.fn();
    const m = sortMenu({ ...base, sort: { key: 'proofs', dir: -1 }, onSort });
    expect(find(m, 'Descending')?.checked).toBe(true);
    find(m, 'Ascending')?.run();
    expect(onSort).toHaveBeenCalledWith({ key: 'proofs', dir: 1 });
  });
});

describe('filterMenu', () => {
  const args = { filters: EMPTY_FILTERS, onState: vi.fn(), onTier: vi.fn(), onNeedsOnly: vi.fn(), onClear: vi.fn() };
  it('lists four states and five tiers, none ticked', () => {
    const m = actions(filterMenu(args));
    expect(m.filter((e) => e.checked !== undefined)).toHaveLength(10);
    expect(m.some((e) => e.checked === true)).toBe(false);
  });
  it('disables Clear Filters until something is filtered', () => {
    expect(find(filterMenu(args), 'Clear Filters')?.disabled).toBe(true);
    const f = { ...EMPTY_FILTERS, source: 'needs' as const };
    expect(find(filterMenu({ ...args, filters: f }), 'Clear Filters')?.disabled).toBe(false);
    expect(find(filterMenu({ ...args, filters: f }), 'Needs You Only')?.checked).toBe(true);
  });
  it('runs the handlers', () => {
    find(filterMenu(args), 'Stale')?.run();
    expect(args.onState).toHaveBeenCalledWith('stale');
    find(filterMenu(args), 'Hands-off')?.run();
    expect(args.onTier).toHaveBeenCalledWith('hands_off');
  });
});

describe('context menus', () => {
  const project = makeProject({ id: 'ledgerline', group: 'core-banking' });
  const row = { project, portfolio: 'acme-lab', collapsed: false, grouped: true, onOpen: vi.fn(), onRepoll: vi.fn(), onCopy: vi.fn(), onReveal: vi.fn(), onToggleGroup: vi.fn() };
  it('builds the project path', () => {
    expect(projectPath('acme-lab', project)).toBe('acme-lab/core-banking/ledgerline');
  });
  it('copies the path and offers to collapse the group', () => {
    const m = rowMenu(row);
    find(m, 'Copy Project Path')?.run();
    expect(row.onCopy).toHaveBeenCalledWith('acme-lab/core-banking/ledgerline');
    expect(find(m, 'Collapse “core-banking”')?.disabled).toBe(false);
    expect(find(rowMenu({ ...row, collapsed: true }), 'Expand “core-banking”')).toBeDefined();
  });
  it('disables the group item when the list is flat', () => {
    expect(find(rowMenu({ ...row, grouped: false }), 'Collapse “core-banking”')?.disabled).toBe(true);
  });
  it('has the five group actions', () => {
    const g = actions(groupMenu({ collapsed: true, onToggle: vi.fn(), onCollapseAll: vi.fn(), onExpandAll: vi.fn(), onOnlyThis: vi.fn() }));
    expect(g.map((e) => e.label)).toEqual(['Expand', 'Collapse All', 'Expand All', 'Show Only This Group']);
  });
});
