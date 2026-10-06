'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { clampToViewport } from '../position';
import { isAction, moveActive, type MenuAction, type MenuEntry, type MenuMove } from './menuModel';
import styles from './Menu.module.css';

const MOVES: Record<string, MenuMove | undefined> = { ArrowDown: 'next', ArrowUp: 'prev', Home: 'first', End: 'last' };
const VIM_MOVES: Record<string, MenuMove | undefined> = { ...MOVES, j: 'next', k: 'prev' };

/**
 * The context / popup menu surface. Normally used through useMenu(); it is exported for custom cases.
 * It takes focus on mount; ArrowUp/Down/Home/End move (plus j / k with `vimKeys`), Enter and Space run, Escape and
 * Tab close. `onHighlight` hears the highlighted action (or null when none, or on close).
 */
export function Menu<D = unknown>({
  items,
  x,
  y,
  onRun,
  onClose,
  onHighlight,
  vimKeys,
  initialActive = -1,
}: {
  items: readonly MenuEntry<D>[];
  x: number;
  y: number;
  onRun: (item: MenuAction<D>) => void;
  /** `refocus` is false when the menu closed because the pointer went elsewhere. */
  onClose: (refocus: boolean) => void;
  onHighlight?: (item: MenuAction<D> | null) => void;
  vimKeys?: boolean;
  initialActive?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initialActive);
  const [pos, setPos] = useState({ x, y });
  const latest = useRef({ items, onHighlight });
  useEffect(() => {
    latest.current = { items, onHighlight };
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPos(clampToViewport({ x, y }, { w: el.offsetWidth, h: el.offsetHeight }, { w: innerWidth, h: innerHeight }));
    el.focus({ preventScroll: true });
  }, [x, y]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose(false);
    };
    document.addEventListener('mousedown', away, true);
    return () => document.removeEventListener('mousedown', away, true);
  }, [onClose]);

  useEffect(() => {
    const { items: list, onHighlight: hear } = latest.current;
    const it = list[active];
    hear?.(it && isAction(it) && !it.disabled ? it : null);
  }, [active]);
  useEffect(() => () => latest.current.onHighlight?.(null), []);

  const run = (i: number) => {
    const it = items[i];
    if (it && isAction(it) && !it.disabled) onRun(it);
  };
  const onKey = (e: KeyboardEvent) => {
    const move = (vimKeys ? VIM_MOVES : MOVES)[e.key];
    if (move) setActive(moveActive(items, active, move));
    else if (e.key === 'Enter' || e.key === ' ') {
      if (active >= 0) run(active);
    } else if (e.key === 'Escape' || e.key === 'Tab') onClose(true);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return createPortal(
    <div ref={ref} className={styles.menu} role="menu" tabIndex={-1} style={{ left: pos.x, top: pos.y }} onKeyDown={onKey} onMouseLeave={() => setActive(-1)}>
      {items.map((it, i) => {
        if ('sep' in it) return <div key={i} className={styles.sep} role="separator" />;
        if ('head' in it)
          return (
            <div key={i} className={styles.mh}>
              {it.head}
            </div>
          );
        const checkable = it.checked !== undefined;
        return (
          <div
            key={i}
            className={`${styles.mi} ${i === active ? styles.act : ''}`}
            role={checkable ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={checkable ? it.checked : undefined}
            aria-disabled={it.disabled || undefined}
            onMouseMove={() => !it.disabled && setActive(i)}
            onClick={() => run(i)}
          >
            <span className={styles.ck}>{it.checked ? '✓' : ''}</span>
            {it.glyph}
            <span>{it.label}</span>
            {it.sc ? <span className={styles.sc}>{it.sc}</span> : null}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
