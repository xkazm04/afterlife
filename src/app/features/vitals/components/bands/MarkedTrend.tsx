import type { CSSProperties } from 'react';
import { TrendStrip } from '@/components/viz/trend/TrendStrip';
import { CELLS } from '../../model/production';
import type { Marker } from '../../model/types';
import styles from '../../vitals.module.css';

/** The kit's trend strip (28 cells of 6 h) with a tick over it for each deploy in the window, placed by its time. */
export function MarkedTrend({ values, label, markers }: { values: readonly (number | null)[]; label: string; markers: readonly Marker[] }) {
  return (
    <span className={styles.marked}>
      <TrendStrip values={values} label={`${label}, 6-hour cells`} days={CELLS} unit={['cell', 'cells']} />
      {markers.map((m) => (
        <i
          key={`${m.runId}:${m.stage}`}
          className={styles.deploy}
          style={{ '--x': `${(m.x * 100).toFixed(2)}%` } as CSSProperties}
          title={`deploy: run ${m.runId}, ${m.stage}, ${m.at}`}
          data-deploy={m.runId}
          aria-hidden
        />
      ))}
    </span>
  );
}
