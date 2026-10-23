import { Legend } from '@/components/overlays/popover/Legend';
import { STEP_ROWS, TRACK_ROWS } from './legendRows';
import styles from './SetupLegend.module.css';

const node = (cls: string) => <span className={`${styles.n} ${styles[cls] ?? ''}`} />;
const step = (cls: string) => <span className={`${styles.m} ${styles[cls] ?? ''}`} aria-hidden="true" />;
const edge = (cls: string) => (
  <svg width="22" height="6" aria-hidden="true">
    <path d="M1 3h20" className={`${styles.e} ${styles[cls] ?? ''}`} />
  </svg>
);

/** The legend behind the ? in the status bar: node states, edge kinds, and what is illustrative. */
export function SetupLegend() {
  return (
    <>
      <Legend rows={TRACK_ROWS.map((r) => [node(r.cls), r.text])} />
      <hr />
      <Legend rows={STEP_ROWS.map((r) => [step(r.cls), r.text])} />
      <hr />
      <Legend
        rows={[
          [edge('needs'), 'Needs / relies on (lit for the pick)'],
          [edge('wait'), 'Waits on a gate of yours'],
          [edge('dep'), 'Track needs track'],
          [edge('unk'), 'Unknown capability'],
        ]}
      />
      <hr />
      <div className={styles.muted}>Capability edges are illustrative · click a node · it opens its page · Esc clears · Tab walks the map</div>
    </>
  );
}
