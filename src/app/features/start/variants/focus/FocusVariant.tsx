'use client';

import { useId } from 'react';
import { StepBody } from '../../components/StepBody';
import { StepPulse } from '../../components/StepPulse';
import type { StartView } from '../../model/view';
import { DotRail } from './DotRail';
import { PlaceArt } from './PlaceArt';
import styles from './focus.module.css';

/**
 * Focus: one step at a time, full-bleed. The dot rail on top, then the place's picture, the step's title with its pulse,
 * and its body. It follows the current step on its own (the view's `selected`), so a step that turns done hands over to
 * the next with a short slide; a done step on the rail can be revisited. No motion under reduced motion.
 */
export function FocusVariant({ view }: { view: StartView }) {
  const step = view.steps.find((s) => s.key === view.selected) ?? view.steps[0];
  const h = useId();
  if (!step) return null;
  const n = view.steps.indexOf(step) + 1;
  return (
    <div className={styles.focus}>
      <DotRail steps={view.steps} current={view.current} selected={view.selected} onSelect={view.select} />
      <section key={step.key} className={styles.stage} data-state={step.state} aria-labelledby={h}>
        <PlaceArt place={step.place} />
        <div className={styles.copy}>
          <span className={styles.where}>
            {n} of {view.steps.length} · {step.place}
          </span>
          <h2 id={h} className={styles.title}>
            <StepPulse state={step.state} />
            {step.title}
          </h2>
          <StepBody view={view} step={step} />
        </div>
      </section>
    </div>
  );
}
