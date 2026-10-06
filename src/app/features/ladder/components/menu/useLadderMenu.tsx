'use client';

// kit-candidate: useMenu for LadderMenu (same API as the shared hook, entries with a glyph and an onHighlight).
import { useCallback, useState, type ReactNode } from 'react';
import { LadderMenu } from './LadderMenu';
import type { LadderMenuAction, LadderMenuEntry } from './menuTypes';

interface OpenState {
  x: number;
  y: number;
  fixed?: readonly LadderMenuEntry[];
  returnTo: HTMLElement | null;
  initialActive: number;
  version: number;
}

export interface LadderMenuApi {
  menu: ReactNode;
  isOpen: boolean;
  openAt: (x: number, y: number, opts?: { items?: readonly LadderMenuEntry[]; returnTo?: HTMLElement | null; highlightFirst?: boolean }) => void;
  openFrom: (el: HTMLElement, opts?: { items?: readonly LadderMenuEntry[]; highlightFirst?: boolean }) => void;
  close: () => void;
}

/**
 * Menu state in one hook. `build` makes the entries from current state on every render, so checkable items (the
 * sort menu) stay open and show what they just changed; entries passed to openAt / openFrom are fixed and every
 * click closes the menu. Focus returns to the opener when the menu closes by key or by running an item.
 */
export function useLadderMenu(build?: () => readonly LadderMenuEntry[], onHighlight?: (item: LadderMenuAction | null) => void): LadderMenuApi {
  const [open, setOpen] = useState<OpenState | null>(null);

  const openAt = useCallback<LadderMenuApi['openAt']>((x, y, opts = {}) => {
    const active = document.activeElement;
    const returnTo = opts.returnTo ?? (active instanceof HTMLElement ? active : null);
    setOpen((prev) => ({ x, y, fixed: opts.items, returnTo, initialActive: opts.highlightFirst ? 0 : -1, version: (prev?.version ?? 0) + 1 }));
  }, []);

  const openFrom = useCallback<LadderMenuApi['openFrom']>(
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
    const run = (item: LadderMenuAction) => {
      const keep = keepOpen && item.checked !== undefined;
      if (!keep) shut(true);
      item.run();
    };
    menu = <LadderMenu key={open.version} items={items} x={open.x} y={open.y} initialActive={open.initialActive} onRun={run} onClose={shut} onHighlight={onHighlight} />;
  }
  return { menu, isOpen: open !== null, openAt, openFrom, close };
}
