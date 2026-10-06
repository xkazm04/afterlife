'use client';

import type { ReactNode } from 'react';
import type { Lit } from '../../../model/map/hot';
import type { Focus } from '../../../model/types';
import type { NodeEvents } from './nodeTypes';
import styles from './nodes.module.css';

/**
 * One node of the unlock map: a real button. `data-node` is how the edge layer finds it to measure.
 * `lit` is hot (on the path of the hover or pick) or dim (everything else while something is lit).
 */
export function MapNode({
  focus, selected, lit, tip, events, className, children,
}: {
  focus: Focus;
  selected: boolean;
  lit: Lit;
  tip: string;
  events: NodeEvents;
  className: string;
  children: ReactNode;
}) {
  const cls = [styles.nd, className, lit === 'hot' ? styles.hot : '', lit === 'dim' ? styles.dim : ''].filter(Boolean).join(' ');
  const enter = (e: { currentTarget: HTMLElement }) => events.onEnter(focus, e.currentTarget, tip);
  return (
    <button
      type="button"
      className={cls}
      data-node={`${focus.k}:${focus.id}`}
      aria-pressed={selected}
      onClick={() => events.onPick(focus)}
      onMouseEnter={enter}
      onFocus={enter}
      onMouseLeave={events.onLeave}
      onBlur={events.onLeave}
    >
      {children}
    </button>
  );
}
