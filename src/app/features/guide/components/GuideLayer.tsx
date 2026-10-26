'use client';

import type { CSSProperties } from 'react';
import type { Box } from '@/app/features/xray/model/types';
import type { Step } from '../model/steps';
import styles from './layer.module.css';

const PAD = 6;

/** The ring's box: the target with a little air, kept inside the window. */
const ringOf = (b: Box): CSSProperties => ({ left: b.x - PAD, top: b.y - PAD, width: b.w + PAD * 2, height: b.h + PAD * 2 });

/**
 * What the guide draws over the real screen: a spotlight ring that dims the rest of the window and glides from part to
 * part and from screen to screen (the stage holds its last place while the next screen comes in), a ghost cursor where the
 * person acts, and the tripwire's pink sweep across the class it takes down. Nothing here takes a click: the screen
 * under it stays live.
 */
export function GuideLayer({ step, box, live, entry }: { step: Step; box: Box | null; live: boolean; entry: string }) {
  const tripwire = live && step.effects?.some((e) => e.kind === 'tripwire');
  return (
    <>
      <div className={`${styles.ring} ${box ? styles.on : ''}`} style={box ? ringOf(box) : undefined} aria-hidden="true" />
      {tripwire && box ? (
        <div key={entry} className={styles.trip} style={ringOf(box)} aria-hidden="true">
          <span className={styles.flash} />
          <span className={styles.line} />
        </div>
      ) : null}
      {step.cursor && live && box ? (
        <div
          key={`cur-${entry}`}
          className={styles.cur}
          style={{ transform: `translate(${box.x + box.w * 0.55}px, ${box.y + box.h * 0.6}px)` }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 22 26">
            <path d="M2 1l16 12-7 1.5 4 8-3 1.5-4-8L2 20z" />
          </svg>
          <span className={styles.rip} />
        </div>
      ) : null}
    </>
  );
}
