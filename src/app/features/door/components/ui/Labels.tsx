'use client';

import { memo } from 'react';
import type { CSSProperties } from 'react';
import { PT, type District } from '../../model/city';
import { districtLine } from '../../model/words';
import styles from './answer.module.css';

/** One label under each district plate: its name, its count, its amber decisions and stale chip. Opens the district. */
export const Labels = memo(function Labels({ ds, hotG, tabbable, onHover, onOpen }: { ds: readonly District[]; hotG: number | null; tabbable: boolean; onHover: (gi: number | null) => void; onOpen: (gi: number) => void }) {
  return (
    <div className={styles.labels}>
      {ds.map((d, i) => (
        <button
          key={d.gi}
          type="button"
          data-role="door-label"
          className={`${styles.dlabel} ${hotG === d.gi ? styles.hot : ''}`}
          style={{ left: d.B[0], top: d.B[1] + PT + 15, '--i': i } as CSSProperties}
          tabIndex={tabbable ? 0 : -1}
          aria-label={`${d.name}: ${districtLine(d)
            .map((x) => x[0])
            .join('')}. Open the district.`}
          onPointerEnter={() => onHover(d.gi)}
          onPointerLeave={() => onHover(null)}
          onFocus={() => onHover(d.gi)}
          onClick={() => onOpen(d.gi)}
        >
          <span className={styles.dl1} data-role="door-label-name">
            {d.name}
            <span>{d.n}</span>
          </span>
          <span className={styles.dl2}>
            <span className={styles.a}>
              <i className={styles.dmark} />
              {d.needs}
            </span>
            {d.stale ? <span className={styles.hchip}>{d.stale} stale</span> : null}
          </span>
        </button>
      ))}
    </div>
  );
});
