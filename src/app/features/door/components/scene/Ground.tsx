'use client';

import { memo, useMemo } from 'react';
import { HZ } from '../../model/city';
import { groundOf } from '../../model/ground';
import styles from './ground.module.css';

/**
 * The ground: sky, the diamond lattice, circuit traces with vias, the distant skyline and the split horizon (cyan, with
 * a pink ghost 1.5 px under it). Static: about a dozen nodes, rastered once. Pulses run in their own layer (Pulses).
 */
export const Ground = memo(function Ground() {
  const g = useMemo(() => groundOf(), []);
  return (
    <svg className={styles.svg} width="1600" height="1000" viewBox="0 0 1600 1000" aria-hidden>
      <rect x="-4000" y="-4000" width="10000" height={4000 + HZ} fill="url(#d-sky)" />
      <rect x="-4000" y={HZ} width="10000" height="6000" fill="url(#d-grid)" mask="url(#d-ground)" />
      <g mask="url(#d-ground)">
        <path className={styles.trace} d={g.traces} />
        <path className={styles.bus} d={g.bus} />
        <path className={styles.via} d={g.vias} />
      </g>
      <path className={styles.skyline} d={g.skyline} />
      <path className={styles.skylit} d={g.skylit} />
      <rect x="-4000" y={HZ} width="10000" height="230" fill="url(#d-haze)" />
      <rect x="-4000" y={HZ - 40} width="10000" height="80" fill="url(#d-hzglow)" />
      <line className={styles.hz} x1="-4000" y1={HZ} x2="6000" y2={HZ} />
      <line className={styles.hz2} x1="-4000" y1={HZ + 1.5} x2="6000" y2={HZ + 1.5} />
    </svg>
  );
});

/** Eight data pulses running along bus traces: their own small layer, so the ground never repaints for them. */
export const Pulses = memo(function Pulses() {
  const g = useMemo(() => groundOf(), []);
  return (
    <svg className={styles.svg} width="1600" height="1000" viewBox="0 0 1600 1000" aria-hidden>
      <g mask="url(#d-ground)">
        {g.pulses.map((d, i) => (
          <g key={i} style={{ animationDuration: `${7 + ((i * 3.7) % 7)}s`, animationDelay: `${-((i * 5.3) % 14)}s` }} className={styles.pulseG}>
            <path className={`${styles.pulse} ${styles.wide}`} data-ambient="city" pathLength={1} d={d} />
            <path className={styles.pulse} data-ambient="city" pathLength={1} d={d} />
          </g>
        ))}
      </g>
    </svg>
  );
});
