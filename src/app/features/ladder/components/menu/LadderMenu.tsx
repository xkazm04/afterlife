'use client';

// kit-candidate: Menu with a leading glyph per item and an onHighlight callback (styles are the shared Menu's).
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/components/overlays/menu/Menu.module.css';
import { moveActive, type MenuMove } from '@/components/overlays/menu/menuModel';
import { clampToViewport } from '@/components/overlays/position';
import { isMenuAction, type LadderMenuAction, type LadderMenuEntry } from './menuTypes';

const MOVES: Record<string, MenuMove | undefined> = { ArrowDown: 'next', j: 'next', ArrowUp: 'prev', k: 'prev', Home: 'first', End: 'last' };

/**
 * The Ladder's menu surface: the shared Menu's look and keys (plus j / k), an optional glyph per item, and
 * `onHighlight` (the highlighted action, or null). Focus moves in on mount; Escape and Tab close.
 */
export function LadderMenu({
  items,
  x,
  y,
  initialActive = -1,
  onRun,
  onClose,
  onHighlight,
}: {
  items: readonly LadderMenuEntry[];
  x: number;
  y: number;
  initialActive?: number;
  onRun: (item: LadderMenuAction) => void;
  onClose: (refocus: boolean) => void;
  onHighlight?: (item: LadderMenuAction | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initialActive);
  const [pos, setPos] = useState({ x, y });
  const highlight = useRef(onHighlight);
  useEffect(() => {
    highlight.current = onHighlight;
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
    const it = items[active];
    highlight.current?.(it && isMenuAction(it) && !it.disabled ? it : null);
  }, [active, items]);
  useEffect(() => () => highlight.current?.(null), []);

  const run = (i: number) => {
    const it = items[i];
    if (it && isMenuAction(it) && !it.disabled) onRun(it);
  };
  const onKey = (e: KeyboardEvent) => {
    const move = MOVES[e.key];
    if (move) setActive(moveActive(items, active, move));
    else if (e.key === 'Enter' || e.key === ' ') {
      if (active >= 0) run(active);
    } else if (e.key === 'Escape' || e.key === 'Tab') onClose(true);
    e.preventDefault();
    e.stopPropagation();
  };

  return createPortal(
    <div ref={ref} className={styles.menu} role="menu" tabIndex={-1} style={{ left: pos.x, top: pos.y }} onKeyDown={onKey} onMouseLeave={() => setActive(-1)}>
      {items.map((it, i) => {
        if ('sep' in it) return <div key={i} className={styles.sep} role="separator" />;
        if ('head' in it) return <div key={i} className={styles.mh}>{it.head}</div>;
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
            {it.lead}
            <span>{it.label}</span>
            {it.sc ? <span className={styles.sc}>{it.sc}</span> : null}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
