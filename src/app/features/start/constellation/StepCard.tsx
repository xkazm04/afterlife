'use client';

import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { StepBody } from '../components/StepBody';
import { StepPulse } from '../components/StepPulse';
import type { StartView, StepView } from '../model/view';
import type { Spot } from './sky';
import styles from './card.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export interface CardProps {
  view: StartView;
  step: StepView;
  /** The pressed node, in percent of the stage: the card grows out of it and folds back into it. */
  from: Spot;
  closing: boolean;
  onClose: () => void;
  /** The fold finished (or there was none to wait for): the node takes focus back. */
  onClosed: () => void;
}

/** Tab stays inside the card while it is open (the orbit behind it is inert); Esc folds it back. */
function trap(e: KeyboardEvent<HTMLDivElement>, box: HTMLDivElement | null, onClose: () => void) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    return;
  }
  if (e.key !== 'Tab' || !box?.querySelectorAll) return;
  const all = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = all[0];
  const last = all.at(-1);
  if (!first || !last) return;
  const to = e.shiftKey ? (document.activeElement === first ? last : null) : document.activeElement === last ? first : null;
  if (!to) return;
  e.preventDefault();
  to.focus();
}

/**
 * The step card, grown out of its node: transform-origin at the node's spot (in the stage's own container units, so it
 * holds at any width), from a scale of 0.06; it folds back the same way. It holds the step's title and StepBody, nothing
 * more. Under reduced motion it simply appears and goes.
 */
export function StepCard({ view, step, from, closing, onClose, onClosed }: CardProps) {
  const box = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const h = useId();
  useEffect(() => heading.current?.focus?.(), [step.key]);
  const n = view.steps.indexOf(step) + 1;
  return (
    <div
      ref={box}
      className={styles.card}
      role="dialog"
      aria-modal="true"
      aria-labelledby={h}
      data-state={step.state}
      data-closing={closing || undefined}
      style={{ '--nx': from.x, '--ny': from.y } as CSSProperties}
      onKeyDown={(e) => trap(e, box.current, onClose)}
      onAnimationEnd={(e) => {
        if (closing && e.target === box.current) onClosed();
      }}
    >
      <header className={styles.head}>
        <span className={styles.where}>
          {n} of {view.steps.length} · {step.place}
        </span>
        <button type="button" className={styles.close} aria-label={`Fold ${step.title} back into the orbit`} onClick={onClose}>
          ✕
        </button>
      </header>
      <h2 id={h} ref={heading} tabIndex={-1} className={styles.title}>
        <StepPulse state={step.state} />
        {step.title}
      </h2>
      <StepBody view={view} step={step} />
    </div>
  );
}
