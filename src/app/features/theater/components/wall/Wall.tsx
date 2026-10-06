'use client';

import type { CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useReplaySlice } from '../../hooks/useReplaySlice';
import { GUARD_STEP, motionAt, pct } from '../../model/derive/climb';
import type { Snapshot } from '../../model/derive/snapshots';
import { progress } from '../../model/replay/state';
import type { ReplayStore } from '../../model/replay/store';
import type { TheaterDemo } from '../../model/types';
import { Cap } from './Cap';
import styles from './Wall.module.css';

const y = (v: number, lift = 0): CSSProperties => ({ '--y': `${v}%`, '--lift': lift }) as CSSProperties;
const at = (step: number): CSSProperties => ({ bottom: `${pct(step)}%` });

/**
 * The rope climb. !41 climbs nine holds with the lit rope below it and the caption beside it; !44 climbs its own
 * line, falls, and is arrested at the guardbar. This is the one part that reads the film position every frame.
 */
export function Wall({ store, snaps, demo }: { store: ReplayStore; snaps: readonly Snapshot[]; demo: TheaterDemo }) {
  const reduced = useReducedMotion();
  const { i, p } = useReplaySlice(
    store,
    (s) => ({ i: s.i, p: progress(s) }),
    (a, b) => a.i === b.i && a.p === b.p,
  );
  const snap = snaps[i];
  if (!snap) return null;
  const m = motionAt(snap.e, snap.beat, p, reduced);
  const m44 = snap.e.sc === 'm44';
  return (
    <div className={styles.wall}>
      {demo.loop.map((b, k) => (
        <div key={b.n} className={`${styles.hold} ${b.n < snap.beat ? styles.done : ''} ${b.n === snap.beat ? styles.cur : ''}`} style={at(k)}>
          <div className={styles.lab}>
            <b>{b.label}</b>
            <span>{b.stage}</span>
          </div>
          <div className={styles.bolt}>{b.n}</div>
        </div>
      ))}
      <div className={`${styles.rope} ${styles.main}`} />
      <div className={styles.lit} style={{ height: `${Math.max(0, m.c41)}%` }} />
      <div className={`${styles.rope} ${styles.side} ${m.show44 ? styles.sideOn : ''}`} style={{ bottom: 0, height: `${pct(GUARD_STEP)}%` }} />
      <div className={`${styles.guardbar} ${m.caught ? styles.caught : ''}`} style={at(GUARD_STEP)} />
      <div className={styles.climber} style={y(m.c41, m.lift)}>
        !41
      </div>
      {m.show44 ? (
        <div className={`${styles.climber} ${styles.c44} ${m.caught ? styles.fell : ''}`} style={y(pct(m.y44))}>
          !44
        </div>
      ) : null}
      {m.caught ? (
        <div className={styles.catch} style={y(pct(m.y44))}>
          caught
          <br />
          seeded
        </div>
      ) : null}
      <Cap e={snap.e} y={m.cap} cut={m44} quote={demo.quote} />
    </div>
  );
}
