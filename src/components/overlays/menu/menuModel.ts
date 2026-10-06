// Pure model of a menu: entries and keyboard navigation over the enabled ones.
import type { ReactNode } from 'react';

/** `D` is what the caller hangs on an item (`data`) to recognise it again in `onHighlight`. */
export interface MenuAction<D = unknown> {
  label: string;
  run: () => void;
  /** A glyph before the label (a TierMark, an icon), after the tick column. */
  glyph?: ReactNode;
  /** Whatever the caller wants back when this item is highlighted (see useMenu's onHighlight). */
  data?: D;
  /** Shortcut text shown right-aligned, e.g. "↩" or "⌘I". */
  sc?: string;
  /** Present (true or false) makes it a checkable item with a leading tick. */
  checked?: boolean;
  disabled?: boolean;
}
export type MenuEntry<D = unknown> = MenuAction<D> | { sep: true } | { head: string };

export const isAction = <D,>(e: MenuEntry<D>): e is MenuAction<D> => 'label' in e;

/** Indexes of the entries that can be highlighted and run. */
export function enabledIndexes(items: readonly MenuEntry[]): number[] {
  const out: number[] = [];
  items.forEach((e, i) => {
    if (isAction(e) && !e.disabled) out.push(i);
  });
  return out;
}

export type MenuMove = 'next' | 'prev' | 'first' | 'last';

/** The next highlighted index. Wraps around; with nothing highlighted (-1), next is first and prev is last. */
export function moveActive(items: readonly MenuEntry[], current: number, move: MenuMove): number {
  const idx = enabledIndexes(items);
  if (!idx.length) return -1;
  if (move === 'first') return idx[0] ?? -1;
  if (move === 'last') return idx[idx.length - 1] ?? -1;
  const pos = idx.indexOf(current);
  if (pos < 0) return (move === 'next' ? idx[0] : idx[idx.length - 1]) ?? -1;
  const step = move === 'next' ? 1 : -1;
  return idx[(pos + step + idx.length) % idx.length] ?? -1;
}
