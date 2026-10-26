'use client';

import { useEffect, useRef } from 'react';
import { xrayStore } from '@/app/features/xray/model/store';
import { Dock } from './components/Dock';
import { GuideController } from './components/GuideController';
import { GuideLayer } from './components/GuideLayer';
import { Recap } from './components/Recap';
import { useStage } from './hooks/useStage';
import { STEPS } from './model/steps';
import { entryOf, useGuide } from './model/store';
import styles from './components/layer.module.css';

/**
 * The guide, as the (app) layout hands it to AppFrame: drawn inside the window box, over the real screens it plays the
 * story on. Off, it draws nothing but its controller (first visit, G, the help event, the autoplay timer). On, it turns
 * the X-ray off: one layer explains the screen at a time.
 */
export function GuideOverlay() {
  const g = useGuide();
  const step = g.on ? (STEPS[g.i] ?? null) : null;
  const entry = entryOf(g);
  const ref = useRef<HTMLDivElement>(null);
  const stage = useStage(ref, step, entry);

  useEffect(() => {
    if (g.on) xrayStore.setOn(false);
  }, [g.on]);

  return (
    <>
      <GuideController g={g} />
      {step ? (
        <div ref={ref} className={styles.layer} data-guide-layer>
          {step.target ? <GuideLayer step={step} box={stage.box} live={stage.live} entry={entry} /> : <Recap />}
          <Dock g={g} />
        </div>
      ) : null}
    </>
  );
}
