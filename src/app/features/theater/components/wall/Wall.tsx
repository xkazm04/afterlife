'use client';

import type { CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useReplaySlice } from '../../hooks/useReplaySlice';
import { GUARD_STEP, motionAt, pct } from '../../model/derive/climb';
import type { Snapshot } from '../../model/derive/snapshots';
import { progress } from '../../model/replay/state';
import type { ReplayStore } from '../../model/replay/store';
import type { Film } from '../../model/types';
import { Cap } from './Cap';
import styles from './Wall.module.css';

const y = (v: number, lift = 0): CSSProperties => ({ '--y': `${v}%`, '--lift': lift }) as CSSProperties;
const at = (step: number): CSSProperties => ({ bottom: `${pct(step)}%` });

/**
 * The rope climb. !41 climbs nine holds with the lit rope below it and the caption beside it; !44 climbs its own
 * line, falls, and is arrested at the guardbar. This is the one part that reads the film position every frame.
 * A real film draws one climber (its MR), marks only the holds an event reached, and has no !44 line and no lit rope.
 */
export function Wall({ store, snaps, film, quote }: { store: ReplayStore; snaps: readonly Snapshot[]; film: Film; quote: string }) {
  const reduced = useReducedMotion();
  const { i, p } = useReplaySlice(
    store,
    (s) => ({ i: s.i, p: progress(s) }),
    (a, b) => a.i === b.i && a.p === b.p,
  );
  const snap = snaps[i];
  if (!snap) return null;
  const side = film.source === 'illustrative';
  const m = motionAt(snap.e, snap.beat, p, reduced, { from: snap.from, side });
  const m44 = snap.e.sc === 'm44';
  const mr = snap.e.ev ? `!${snap.e.ev.iid}` : '!41';
  return (
    <div className={styles.wall}>
      {film.holds.map((b, k) => (
        <div key={b.n} className={`${styles.hold} ${b.n !== snap.beat && snap.reached.includes(b.n) ? styles.done : ''} ${b.n === snap.beat ? styles.cur : ''}`} style={at(k)}>
          <div className={styles.lab}>
            <b>{b.label}</b>
            <span>{b.stage}</span>
          </div>
          <div className={styles.bolt}>{b.n}</div>
        </div>
      ))}
      <div className={`${styles.rope} ${styles.main}`} />
      {side ? <div className={styles.lit} style={{ height: `${Math.max(0, m.c41)}%` }} /> : null}
      {side ? <div className={`${styles.rope} ${styles.side} ${m.show44 ? styles.sideOn : ''}`} style={{ bottom: 0, height: `${pct(GUARD_STEP)}%` }} /> : null}
      {side ? <div className={`${styles.guardbar} ${m.caught ? styles.caught : ''}`} style={at(GUARD_STEP)} /> : null}
      <div className={styles.climber} style={y(m.c41, m.lift)}>
        {mr}
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
      <Cap e={snap.e} y={m.cap} cut={m44} quote={quote} />
    </div>
  );
}
