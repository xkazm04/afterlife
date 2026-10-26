'use client';

import { usePathname } from 'next/navigation';
import { Window } from '@/components/shell/Window';
import styles from './SetupSkeleton.module.css';

/** Node counts per map column (steps, tracks, capabilities): the map's silhouette, not its data. */
const COLUMNS = [9, 8, 7] as const;

/**
 * The Setup window while its data streams in: `map` is the unlock map's shape - a summary strip over three columns of
 * nodes; `node` a detail page's - a back line and section cards. The real title paints at once. It reads no URL data, so
 * it can stand as the fallback of a navigation inside /setup (a dynamic route) without blocking it.
 */
export function SetupSkeleton({ shape }: { shape: 'map' | 'node' }) {
  const map = shape === 'map';
  return (
    <Window title="Setup" subtitle="loading" status="Loading…">
      <div className={styles.pane} role="status" aria-busy="true" aria-label={map ? 'Loading the unlock map' : 'Loading the setup node'}>
        {map ? <MapShape /> : <NodeShape />}
      </div>
    </Window>
  );
}

/**
 * The /setup layout's fallback while it reads the flow (live mode: GitLab's arm blocks, the doctor, the steps): the
 * shape of whichever page was asked for. It reads the path, so it sits only under the (app) loading boundary.
 */
export function SetupLayoutSkeleton() {
  return <SetupSkeleton shape={usePathname() === '/setup' ? 'map' : 'node'} />;
}

function MapShape() {
  return (
    <>
      <span className={`${styles.bar} ${styles.strip}`} />
      <div className={styles.cols}>
        {COLUMNS.map((n, c) => (
          <div key={c} className={styles.col}>
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className={`${styles.bar} ${styles.node}`} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/** /setup/[node] while it reads which node the address names: the detail page's back line, heading and cards. */
function NodeShape() {
  return (
    <div className={styles.detail}>
      <span className={styles.bar} style={{ width: '18%' }} />
      <span className={`${styles.bar} ${styles.head}`} style={{ width: '42%' }} />
      {[0, 1, 2].map((i) => (
        <span key={i} className={`${styles.bar} ${styles.card}`} />
      ))}
    </div>
  );
}
