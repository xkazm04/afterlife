'use client';

import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { Sheet } from '@/components/overlays/Sheet';
import { useToast } from '@/components/overlays/toast/useToast';
import type { CyclesData } from '../../model/build';
import { cycleReport, reportTitle } from '../../model/report/report';
import type { Cycle } from '../../model/types';
import styles from './report.module.css';

/**
 * The hand-back of a closed cycle: the report exactly as it would be posted, the title to post it under, and a copy
 * button. Nothing is posted from here, and no command that posts it is spelled here (a screen never hand-writes a write).
 */
export function ReportSheet({ cycle, data, onClose }: { cycle: Cycle; data: CyclesData; onClose: () => void }) {
  const { status } = useToast();
  const md = cycleReport(cycle, data);
  const copy = () => {
    navigator.clipboard?.writeText(md).then(
      () => status(`${cycle.id} report copied as Markdown`),
      () => status('Copy failed: select the report and copy it by hand'),
    );
  };
  return (
    <Sheet
      title={`${cycle.id} report`}
      subtitle="exactly what would be posted · nothing is posted from here"
      onClose={onClose}
      footer={
        <>
          <span className={styles.count}>{md.split('\n').length} lines of Markdown</span>
          <Spacer />
          <Button onClick={onClose}>Close</Button>
          <Button variant="accent" onClick={copy}>
            Copy as Markdown
          </Button>
        </>
      }
    >
      <pre className={styles.md} tabIndex={0} aria-label={`${cycle.id} report, Markdown`}>
        {md}
      </pre>
      <p className={styles.how}>
        To post it, as you, open a new issue in {data.project} titled <b>{reportTitle(cycle, data.project)}</b> and paste the copied Markdown as its description.
      </p>
    </Sheet>
  );
}
