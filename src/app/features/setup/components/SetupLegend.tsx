import { Legend } from '@/components/overlays/popover/Legend';
import styles from './SetupLegend.module.css';

const node = (cls: string) => <span className={`${styles.n} ${styles[cls] ?? ''}`} />;
const edge = (cls: string) => (
  <svg width="22" height="6" aria-hidden="true">
    <path d="M1 3h20" className={`${styles.e} ${styles[cls] ?? ''}`} />
  </svg>
);

/** The legend behind the ? in the status bar: node states, edge kinds, and what is illustrative. */
export function SetupLegend() {
  return (
    <>
      <Legend
        rows={[
          [node('arm'), 'Armed · revert disarms'],
          [node('rdy'), 'Ready to arm · one MR'],
          [node('lck'), 'Locked · hover says why'],
          [node('you'), 'Needs you · only a person can'],
          [node('unk'), 'Unknown · never rounded up'],
        ]}
      />
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
      <div className={styles.muted}>Capability edges are illustrative · click a node · Esc clears · Tab walks the map · ⌘I inspector</div>
    </>
  );
}
