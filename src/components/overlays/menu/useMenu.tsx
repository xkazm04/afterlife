'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Menu } from './Menu';
import type { MenuAction, MenuEntry } from './menuModel';

interface OpenState {
  x: number;
  y: number;
  /** Items fixed at open time; undefined means "ask `build` on every render". */
  fixed?: readonly MenuEntry[];
  returnTo: HTMLElement | null;
  initialActive: number;
  /** Bumps to re-render after a keep-open toggle. */
  version: number;
}

export interface MenuApi {
  /** Render this somewhere in your component (it portals to <body> when open). */
  menu: ReactNode;
  isOpen: boolean;
  /** Open at a point (a right-click's clientX/clientY). `items` fixes the entries; omit to use `build`. */
  openAt: (x: number, y: number, opts?: { items?: readonly MenuEntry[]; returnTo?: HTMLElement | null; highlightFirst?: boolean }) => void;
  /** Open under a button. Same options as openAt. */
  openFrom: (el: HTMLElement, opts?: { items?: readonly MenuEntry[]; highlightFirst?: boolean }) => void;
  close: () => void;
}

/**
 * Menu state in one hook.
 * - `build` (optional) makes the entries from current state on every render, so a checkable item can stay open
 *   and reflect what it just changed (sort and filter menus). Checkable items from `build` keep the menu open.
 * - Entries passed to openAt/openFrom are fixed (a context menu for one row) and every click closes the menu.
 * Focus returns to the opener (or `returnTo`) when the menu closes by key or by running an item.
 */
export function useMenu(build?: () => readonly MenuEntry[]): MenuApi {
  const [open, setOpen] = useState<OpenState | null>(null);

  const openAt = useCallback<MenuApi['openAt']>((x, y, opts = {}) => {
    const active = document.activeElement;
    const returnTo = opts.returnTo ?? (active instanceof HTMLElement ? active : null);
    setOpen((prev) => ({
      x,
      y,
      fixed: opts.items,
      returnTo,
      initialActive: opts.highlightFirst ? 0 : -1,
      version: (prev?.version ?? 0) + 1,
    }));
  }, []);

  const openFrom = useCallback<MenuApi['openFrom']>(
    (el, opts = {}) => {
      const r = el.getBoundingClientRect();
      openAt(r.left, r.bottom + 4, { ...opts, returnTo: el });
    },
    [openAt],
  );

  const close = useCallback(() => setOpen(null), []);

  let menu: ReactNode = null;
  if (open) {
    const items = open.fixed ?? build?.() ?? [];
    const keepOpen = open.fixed === undefined;
    const shut = (refocus: boolean) => {
      setOpen(null);
      if (refocus) open.returnTo?.focus();
    };
    const run = (item: MenuAction) => {
      const keep = keepOpen && item.checked !== undefined;
      if (!keep) shut(true);
      item.run();
    };
    menu = <Menu key={open.version} items={items} x={open.x} y={open.y} initialActive={open.initialActive} onRun={run} onClose={shut} />;
  }

  return { menu, isOpen: open !== null, openAt, openFrom, close };
}
