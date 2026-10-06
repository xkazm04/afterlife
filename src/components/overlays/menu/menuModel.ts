// Pure model of a menu: entries and keyboard navigation over the enabled ones.

export interface MenuAction {
  label: string;
  run: () => void;
  /** Shortcut text shown right-aligned, e.g. "↩" or "⌘I". */
  sc?: string;
  /** Present (true or false) makes it a checkable item with a leading tick. */
  checked?: boolean;
  disabled?: boolean;
}
export type MenuEntry = MenuAction | { sep: true } | { head: string };

export const isAction = (e: MenuEntry): e is MenuAction => 'label' in e;

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
