'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentOption<V extends string> {
  value: V;
  /** Text, or any node (a tier mark, an icon). */
  label: ReactNode;
  title?: string;
  /** A dim number after the label; it turns bright on the selected segment. */
  count?: number;
  /** The accessible name when `label` is not text ("Hands-off, 3"). */
  ariaLabel?: string;
}

/**
 * A radio group drawn as a segmented control. Arrow keys move and select (wrapping). Generic over the value type.
 * Give `label` for the group's accessible name. Option labels may be nodes, and an option may carry a `count`.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
}) {
  const group = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    e.preventDefault();
    requestAnimationFrame(() => group.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
  };
  return (
    <div ref={group} className={styles.seg} role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          title={o.title}
          aria-label={o.ariaLabel}
          className={o.count !== undefined ? styles.counted : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined ? <span className={styles.ct}>{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
