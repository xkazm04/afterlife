'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { createReopenGuard } from '../popover/reopenGuard';
import { Menu } from './Menu';
import type { MenuAction, MenuEntry } from './menuModel';

interface OpenState<D> {
  x: number;
  y: number;
  /** Items fixed at open time; undefined means "ask `build` on every render". */
  fixed?: readonly MenuEntry<D>[];
  returnTo: HTMLElement | null;
  /** The button it was opened from (openFrom only): a press on it closes the menu, and its click must not reopen it. */
  trigger?: HTMLElement;
  initialActive: number;
  /** Bumps to re-render after a keep-open toggle. */
  version: number;
}

export interface MenuApi<D = unknown> {
  /** Render this somewhere in your component (it portals to <body> when open). */
  menu: ReactNode;
  isOpen: boolean;
  /** Open at a point (a right-click's clientX/clientY). `items` fixes the entries; omit to use `build`. */
  openAt: (x: number, y: number, opts?: { items?: readonly MenuEntry<D>[]; returnTo?: HTMLElement | null; highlightFirst?: boolean }) => void;
  /** Open under a button. Same options as openAt. */
  openFrom: (el: HTMLElement, opts?: { items?: readonly MenuEntry<D>[]; highlightFirst?: boolean }) => void;
  close: () => void;
}

/**
 * Menu state in one hook.
 * - `build` (optional) makes the entries from current state on every render, so a checkable item can stay open
 *   and reflect what it just changed (sort and filter menus). Checkable items from `build` keep the menu open.
 * - Entries passed to openAt/openFrom are fixed (a context menu for one row) and every click closes the menu.
 * - `label` names the menu for assistive tech.
 * - `onHighlight` hears the highlighted action (its `data` says which); `vimKeys` adds j / k.
 * Focus returns to the opener (or `returnTo`) when the menu closes by key or by running an item.
 * A press on the trigger of an open menu closes it, and the click that follows that press does not reopen it; a click with
 * no press before it (assistive tech) on that trigger closes it too.
 */
export function useMenu<D = unknown>(
  build?: () => readonly MenuEntry<D>[],
  cfg: { onHighlight?: (item: MenuAction<D> | null) => void; vimKeys?: boolean; label?: string } = {},
): MenuApi<D> {
  const [open, setOpen] = useState<OpenState<D> | null>(null);
  const [guard] = useState(() => createReopenGuard<HTMLElement>());

  const place = useCallback((x: number, y: number, opts: Parameters<MenuApi<D>['openAt']>[2] & { trigger?: HTMLElement } = {}) => {
    const active = document.activeElement;
    const returnTo = opts.returnTo ?? (active instanceof HTMLElement ? active : null);
    // A click on the trigger the menu is already open from (no press before it: assistive tech, voice control, element.click())
    // closes it; a mouse press is covered by the reopen guard.
    setOpen((prev) => prev && opts.trigger && prev.trigger === opts.trigger ? null : {
      x,
      y,
      fixed: opts.items,
      returnTo,
      trigger: opts.trigger,
      initialActive: opts.highlightFirst ? 0 : -1,
      version: (prev?.version ?? 0) + 1,
    });
  }, []);
  const openAt: MenuApi<D>['openAt'] = place;

  const openFrom = useCallback<MenuApi<D>['openFrom']>(
    (el, opts = {}) => {
      if (guard.swallows(el)) return;
      const r = el.getBoundingClientRect();
      place(r.left, r.bottom + 4, { ...opts, returnTo: el, trigger: el });
    },
    [place, guard],
  );

  const close = useCallback(() => setOpen(null), []);

  let menu: ReactNode = null;
  if (open) {
    const items = open.fixed ?? build?.() ?? [];
    const keepOpen = open.fixed === undefined;
    const shut = (refocus: boolean, target?: EventTarget | null) => {
      if (!refocus && open.trigger) {
        guard.pressClosed(open.trigger, target != null && open.trigger.contains(target as Node));
        guard.forgetOnNextPress();
      }
      setOpen(null);
      if (refocus) open.returnTo?.focus();
    };
    const run = (item: MenuAction<D>) => {
      const keep = keepOpen && item.checked !== undefined;
      if (!keep) shut(true);
      item.run();
    };
    menu = (
      <Menu
        key={open.version}
        items={items}
        x={open.x}
        y={open.y}
        initialActive={open.initialActive}
        onRun={run}
        onClose={shut}
        onHighlight={cfg.onHighlight}
        vimKeys={cfg.vimKeys}
        label={cfg.label}
      />
    );
  }

  return { menu, isOpen: open !== null, openAt, openFrom, close };
}
