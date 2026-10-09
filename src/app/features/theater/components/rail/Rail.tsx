import { memo } from 'react';
import type { Snapshot } from '../../model/derive/snapshots';
import type { TheaterDemo } from '../../model/types';
import { Autonomy } from './Autonomy';
import { CraBlock } from './CraBlock';
import styles from './Rail.module.css';
import { StageRows } from './StageRows';

/**
 * The right rail: autonomy tiers, stages with evidence, the CRA clock. On a real film (`demo` null) the tiers are the
 * ledger's own tier at the time, and the rungs and the CRA clock (which no ledger event feeds) are not drawn.
 */
export const Rail = memo(function Rail({ snap, prev, demo }: { snap: Snapshot; prev?: Snapshot; demo: TheaterDemo | null }) {
  return (
    <section className={styles.rail} aria-label="Autonomy and evidence">
      <Autonomy snap={snap} fromLedger={!demo} />
      {demo ? <StageRows snap={snap} prev={prev} demo={demo} /> : null}
      {demo ? <CraBlock snap={snap} /> : null}
    </section>
  );
});
