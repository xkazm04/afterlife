'use client';

import Link from 'next/link';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { dataLabel } from '@/components/shell/bars/dataLabel';
import { useShellInfo } from '@/components/shell/ShellContext';
import { DEMO_GROUP } from '../../model/demo/projects';
import styles from '../../vitals.module.css';

const ILLUSTRATIVE = 'illustrative demo data';

/** A demo project's mark beside its name: dashed, like every other honesty mark. */
export function DemoChip() {
  return (
    <HonestyChip kind="simulated" meaning={`A demo estate project (${DEMO_GROUP}): illustrative figures, nothing was collected`}>
      demo
    </HonestyChip>
  );
}

/**
 * "illustrative demo data · " at the head of the status line, unless the status bar's own data label already says it
 * (demo mode with `realData` off). Live mode, or a list where real rows sit beside demo ones, would otherwise say less.
 */
export function DemoLabel({ realData }: { realData: boolean }) {
  const { data } = useShellInfo();
  return dataLabel(data, realData) === ILLUSTRATIVE ? null : <>{ILLUSTRATIVE} · </>;
}

/** Above a demo project's bands: what the figures are, that Refresh and the re-measures do not apply, and the way to a real one. */
export function DemoNotice({ name }: { name: string }) {
  return (
    <div className={styles.notice} role="note">
      <span>
        <b>Illustrative demo data.</b> {name} is one of the demo estate&apos;s projects ({DEMO_GROUP}): its CI runs, production signals and adjustments are
        generated for layout. Nothing was collected, so there is nothing to refresh or re-measure. <Link href="/start?add=1">Onboard a project ›</Link> to measure a
        real one.
      </span>
    </div>
  );
}
