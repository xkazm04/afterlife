import { Legend } from '@/components/overlays/popover/Legend';
import { DEP_ROWS, STEP_ROWS, TRACK_ROWS } from './legendRows';
import dep from './shared/DepRow.module.css';
import styles from './SetupLegend.module.css';

const node = (cls: string) => <span className={`${styles.n} ${styles[cls] ?? ''}`} />;
const step = (cls: string) => <span className={`${styles.m} ${styles[cls] ?? ''}`} aria-hidden="true" />;
const edge = (cls: string) => (
  <svg width="22" height="6" aria-hidden="true">
    <path d="M1 3h20" className={`${styles.e} ${styles[cls] ?? ''}`} />
  </svg>
);

const depGlyph = (tone: string, g: string) => (
  <span className={dep[tone]}>
    <span className={dep.gl}>{g}</span>
  </span>
);

/** The legend behind the ? in the status bar. On the map: node states, edge kinds, what is illustrative. On a node page: its dependency lines. */
export function SetupLegend({ where = 'map' }: { where?: 'map' | 'page' }) {
  if (where === 'page')
    return (
      <>
        <Legend rows={DEP_ROWS.map((r) => [depGlyph(r.tone, r.glyph), r.text])} />
        <hr />
        <div className={styles.muted}>Each line is a node this one depends on · click it to open its page</div>
      </>
    );
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
