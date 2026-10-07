'use client';

import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { Sheet } from '@/components/overlays/Sheet';
import { useToast } from '@/components/overlays/toast/useToast';
import type { CyclesData } from '../../model/build';
import { cycleReport, postCommand } from '../../model/report/report';
import type { Cycle } from '../../model/types';
import styles from './report.module.css';

/**
 * The hand-back of a closed cycle: the report exactly as it would be posted, the command that posts it as an issue
 * (as you, from a file), and a copy button. Nothing is posted from here.
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
      <p className={styles.how}>To post it as an issue, as you, save it as {cycle.id.toLowerCase()}-report.md and run:</p>
      <CommandBlock commands={[postCommand(cycle, data.project)]} prompt={false} label="Post the report" />
    </Sheet>
  );
}
