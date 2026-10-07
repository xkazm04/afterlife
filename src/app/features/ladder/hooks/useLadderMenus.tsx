'use client';

import { useCallback, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMenu } from '@/components/overlays/menu/useMenu';
import type { MenuAction, MenuEntry } from '@/components/overlays/menu/menuModel';
import { TierMark } from '@/components/status/TierMark';
import { rowDomId } from '@/components/table/model/rowNavigation';
import { TIER_META } from '@/lib/tiers';
import { commandLines } from '@/server/actions/words';
import { actsFrom, isQuarantine, revokeTargets } from '../model/rules/tiers';
import type { Tier } from '../model/types';
import { SORT_KEYS, SORT_NAMES, defaultDir } from '../model/view/sort';
import type { LadderActions } from './useLadderActions';
import type { LadderData } from './useLadderData';
import type { RevokeWrites } from './useRevokeWrite';

/**
 * The menus of the table: the sort menu (checks stay open), the row and group context menus and the "take it to"
 * target menu. Entries are built when the menu opens, from the state at that moment. The target of the highlighted
 * item is reported through `onHover` so the docked strip can preview its write.
 */
export function useLadderMenus({ data, actions, writes, onHover }: { data: LadderData; actions: LadderActions; writes: RevokeWrites; onHover: (to: Tier | null) => void }) {
  const router = useRouter();
  const { state, dispatch, byId, trackIds } = data;

  const onHighlight = useCallback((item: MenuAction<Tier> | null) => onHover(item?.data ?? null), [onHover]);

  const sortMenu = useMenu<Tier>(
    () => [
      { head: 'Sort by' },
      ...SORT_KEYS.map((k) => ({ label: SORT_NAMES[k], checked: state.sort.key === k, run: () => dispatch({ type: 'sortSet', sort: { key: k, dir: defaultDir(k) } }) })),
      { sep: true as const },
      { label: 'Ascending', checked: state.sort.dir > 0, run: () => dispatch({ type: 'sortSet', sort: { key: state.sort.key, dir: 1 } }) },
      { label: 'Descending', checked: state.sort.dir < 0, run: () => dispatch({ type: 'sortSet', sort: { key: state.sort.key, dir: -1 } }) },
      { sep: true as const },
      { label: 'Group by Track', checked: state.grouped, run: () => dispatch({ type: 'grouped', value: !state.grouped }) },
    ],
    { onHighlight, vimKeys: true },
  );
  const ctx = useMenu<Tier>(undefined, { onHighlight, vimKeys: true });

  const targetEntries = useCallback(
    (id: string): MenuEntry<Tier>[] => {
      const c = byId[id];
      const lower = revokeTargets(c ? actsFrom(c) : null);
      return [
        { head: 'Take it to · runs the write shown' },
        ...lower.map((to, i) => ({
          label: TIER_META[to].name,
          glyph: <TierMark tier={to} />,
          sc: i === 0 ? 'r' : to === 'quarantined' ? 'q' : undefined,
          data: to,
          run: () => actions.revoke(id, to),
        })),
      ];
    },
    [byId, actions],
  );

  const rowEntries = useCallback(
    (id: string): MenuEntry<Tier>[] => {
      const c = byId[id];
      if (!c) return [];
      const lower = revokeTargets(actsFrom(c));
      const eligible = data.promotionOf(c).kind === 'eligible';
      // The exact commands the server planned for the one-step revoke, once they are on screen.
      const first = lower[0];
      const view = first ? writes.viewOf(id, first) : undefined;
      const cmd = view?.kind === 'preview' ? commandLines(view.preview).join('\n') : null;
      const copy = () => {
        if (!cmd) return;
        navigator.clipboard?.writeText(cmd).then(() => actions.flash(`Copied the write for ${id}`), () => actions.flash(cmd));
      };
      return [
        { label: 'Show Rule and Write', sc: '↩', run: () => { actions.select(id); actions.openDetail(id); } },
        { sep: true },
        ...(lower.length ? [...targetEntries(id), { sep: true as const }] : []),
        isQuarantine(c)
          ? { label: 'Re-admit in Needs you…', run: () => router.push('/needs-you') }
          : { label: 'Promote…', sc: 'p', disabled: !eligible, run: () => actions.promote(id) },
        { label: 'Copy Command', disabled: !cmd, run: copy },
        ...(state.grouped ? [{ sep: true as const }, { label: `Collapse ${c.track}`, run: () => dispatch({ type: 'toggleGroup', id: c.track, open: false }) }] : []),
      ];
    },
    [byId, data, actions, writes, targetEntries, router, state.grouped, dispatch],
  );

  const groupEntries = useCallback(
    (tid: string): MenuEntry<Tier>[] => [
      { label: state.collapsed.includes(tid) ? 'Expand' : 'Collapse', run: () => dispatch({ type: 'toggleGroup', id: tid }) },
      { label: 'Collapse All', run: () => dispatch({ type: 'collapseAll', ids: trackIds }) },
      { label: 'Expand All', run: () => dispatch({ type: 'expandAll' }) },
      { sep: true },
      { label: `Show Only ${tid}`, run: () => actions.setSource(tid) },
    ],
    [state.collapsed, dispatch, trackIds, actions],
  );

  /** Right-click: select what was hit, then open its menu at the pointer. */
  const openRowMenu = useCallback((id: string, e: MouseEvent) => { actions.select(id); ctx.openAt(e.clientX, e.clientY, { items: rowEntries(id) }); }, [actions, ctx, rowEntries]);
  const openGroupMenu = useCallback((tid: string, e: MouseEvent) => { actions.select(`g:${tid}`); ctx.openAt(e.clientX, e.clientY, { items: groupEntries(tid) }); }, [actions, ctx, groupEntries]);

  /** The ContextMenu key: the menu of the selected row, under it, first item lit. */
  const openForSelection = useCallback(() => {
    const sel = data.sel;
    const el = sel ? document.getElementById(rowDomId(sel)) : null;
    if (!sel || !el) return;
    const r = el.getBoundingClientRect();
    const items = sel.startsWith('g:') ? groupEntries(sel.slice(2)) : rowEntries(sel);
    ctx.openAt(r.left + 40, r.bottom, { items, highlightFirst: true });
  }, [data.sel, ctx, groupEntries, rowEntries]);

  const openTargets = useCallback((id: string, el: HTMLElement) => { actions.select(id); ctx.openFrom(el, { items: targetEntries(id) }); }, [actions, ctx, targetEntries]);

  const menus = (
    <>
      {sortMenu.menu}
      {ctx.menu}
    </>
  );
  return { menus, isOpen: sortMenu.isOpen || ctx.isOpen, openSort: (el: HTMLElement) => sortMenu.openFrom(el), openRowMenu, openGroupMenu, openForSelection, openTargets };
}
