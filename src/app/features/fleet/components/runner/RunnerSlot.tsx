import Link from 'next/link';
import type { ReactNode } from 'react';
import { Reveal, Unread, type SliceState } from '@/components/shell/host';
import type { FleetDesk } from '../../model/screen/slices';
import { RunnerFleet } from './RunnerFleet';
import styles from './runner.module.css';

/**
 * The runner strip's place above the table, held from the first frame so the table never moves when the desk lands:
 * the strip's own summary line with a dash for every value while the runner's files and git are read, then the strip
 * (RunnerFleet), or why it could not be read.
 */
export function RunnerSlot({ desk }: { desk: SliceState<FleetDesk> }) {
  if (desk.state === 'ok') return <RunnerFleet desk={desk.data.runner} unmatched={desk.data.cost.unmatched} />;
  return (
    <div className={styles.strip} aria-label="Cycle runner" aria-busy={desk.state === 'unread' || undefined}>
      <div className={styles.sum}>
        <b>Cycle runner</b>
        {desk.state === 'error' ? (
          <span>could not be read: {desk.reason}</span>
        ) : (
          <>
            <span>
              <Unread label="repos not read yet" /> repos
            </span>
            <span>
              <Unread label="spend not read yet" /> spent
            </span>
            <span className={styles.dim}>
              <Unread label="decisions not read yet" /> to decide
            </span>
          </>
        )}
        <Link href="/runs" className={styles.dim}>
          runs
        </Link>
      </div>
    </div>
  );
}

/**
 * Fleet's content pane: the runner strip's slot on top (it enters when the desk lands), the table filling the rest (it
 * enters when the fleet lands). No `desk`: the table alone.
 */
export function FleetPane({ desk, children }: { desk?: SliceState<FleetDesk>; children: ReactNode }) {
  if (!desk) return children;
  return (
    <div className={styles.stack}>
      <Reveal order={3} slice="desk" className={styles.slot}>
        <RunnerSlot desk={desk} />
      </Reveal>
      <div className={styles.tableBox}>
        <Reveal order={2} slice="core" className={styles.fill}>
          {children}
        </Reveal>
      </div>
    </div>
  );
}
