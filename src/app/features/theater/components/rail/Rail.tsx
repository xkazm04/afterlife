import { memo } from 'react';
import type { Snapshot } from '../../model/derive/snapshots';
import type { TheaterDemo } from '../../model/types';
import { Autonomy } from './Autonomy';
import { CraBlock } from './CraBlock';
import styles from './Rail.module.css';
import { StageRows } from './StageRows';

/** The right rail: autonomy tiers, stages with evidence, the CRA clock. */
export const Rail = memo(function Rail({ snap, prev, demo }: { snap: Snapshot; prev?: Snapshot; demo: TheaterDemo }) {
  return (
    <section className={styles.rail} aria-label="Autonomy and evidence">
      <Autonomy snap={snap} />
      <StageRows snap={snap} prev={prev} demo={demo} />
      <CraBlock snap={snap} />
    </section>
  );
});
