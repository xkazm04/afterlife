import { DetailSection } from '@/components/shell/detail/DetailPage';
import { KeyValue } from '@/components/inspector/KeyValue';
import type { FeedRow } from '../../../model/inspector';
import { DemoChip } from '../DemoChip';
import styles from './sections.module.css';

/**
 * Last poll, feed health, environments, open CRA items; the deep project adds its webhooks and unattributed events,
 * labelled demo when they are the catalogue's (`demoCockpit`).
 */
export function FeedSection({ rows: feed, demoCockpit }: { rows: FeedRow[]; demoCockpit: boolean }) {
  const rows = feed.map(({ label, value, bad, cockpit }) => {
    if (bad) return [label, <span key="v" className={styles.err}>{value}</span>] as const;
    if (cockpit && demoCockpit) return [label, <span key="v">{value} <DemoChip /></span>] as const;
    return [label, value] as const;
  });
  return (
    <DetailSection title="Feed">
      <KeyValue rows={rows} />
    </DetailSection>
  );
}
